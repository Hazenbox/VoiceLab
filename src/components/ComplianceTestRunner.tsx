/**
 * ComplianceTestRunner
 *
 * In-app test runner that:
 * 1. Creates 23 chat projects (one per test group) in localStorage
 * 2. Runs all 333 tests sequentially through the pipeline / checker
 * 3. Stores prompts & responses as real ChatMessages (reviewable in sidebar)
 * 4. Shows a real-time dashboard with scores, progress, pass/fail
 * 5. Generates a downloadable markdown report
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TEST_GROUPS, ALL_TESTS, type TestGroup, type ComplianceTestCase } from '../tests/complianceTestCases';
import { evaluateTest, type TestResult, type GroupResult, type FullReport } from '../tests/complianceEvaluator';
import { generateMarkdownReport } from '../tests/generateComplianceReport';
import { storageProjects, generateId } from '../services/storage';
import { chatStorage } from '../services/chatStorage';
import type { Project, ChatMessage, ChatMode } from '../types';
import { generateMessageId } from '../types';
import { useProject } from '../context/ProjectContext';
import { createLLMProvider as createLLMProviderFactory } from '../services/providers/llm';
import { getSyncService } from '../services/sync/convexSync';
import { useThemeColors } from '../theme';
import { Button, Title, Text, Badge, Divider, globalToastQueue, ToastRegion } from '@marcelinodzn/ds-react';
import { chatTypography } from '../theme/typography';
import { DSIcon } from './DSIcon';
import { ActionButton } from './ActionButton';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface RunState {
  status: 'idle' | 'running' | 'done' | 'cancelled';
  currentGroup: number;
  currentTest: number;
  totalCompleted: number;
  results: Map<string, TestResult>;
  groupResults: GroupResult[];
  startTime: number;
  report: FullReport | null;
}

interface ProjectMapping {
  groupId: string;
  projectId: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const TEST_PROJECT_PREFIX = '[test] ';

// Separate storage key for compliance test results - completely isolated from production chatStorage
const TEST_STORAGE_KEY = 'voicelab_compliance_test_results';

// ═══════════════════════════════════════════════════════════════════════════════
// ISOLATED TEST STORAGE
// ═══════════════════════════════════════════════════════════════════════════════

interface TestStorageEntry {
  projectId: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    testMetadata?: {
      testId: string;
      status: string;
      score: number;
      notes: string[];
      failedPatterns: string[];
      failPatternMatches: string[];
    };
  }>;
}

const testStorage = {
  load(projectId: string): TestStorageEntry['messages'] {
    try {
      const data = localStorage.getItem(TEST_STORAGE_KEY);
      if (!data) return [];
      const store: Record<string, TestStorageEntry['messages']> = JSON.parse(data);
      return store[projectId] || [];
    } catch {
      return [];
    }
  },
  
  save(projectId: string, messages: TestStorageEntry['messages']): void {
    try {
      const data = localStorage.getItem(TEST_STORAGE_KEY);
      const store: Record<string, TestStorageEntry['messages']> = data ? JSON.parse(data) : {};
      store[projectId] = messages;
      localStorage.setItem(TEST_STORAGE_KEY, JSON.stringify(store));
    } catch (err) {
      console.warn('[TestStorage] Failed to save:', err);
    }
  },
  
  clear(projectId: string): void {
    try {
      const data = localStorage.getItem(TEST_STORAGE_KEY);
      if (!data) return;
      const store: Record<string, TestStorageEntry['messages']> = JSON.parse(data);
      delete store[projectId];
      localStorage.setItem(TEST_STORAGE_KEY, JSON.stringify(store));
    } catch (err) {
      console.warn('[TestStorage] Failed to clear:', err);
    }
  },
  
  clearAll(): void {
    localStorage.removeItem(TEST_STORAGE_KEY);
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function ComplianceTestRunner() {
  const theme = useThemeColors();
  const navigate = useNavigate();
  const { createProject, projects, deleteProject, setActiveProject } = useProject();
  const cancelRef = useRef(false);

  const [state, setState] = useState<RunState>({
    status: 'idle',
    currentGroup: 0,
    currentTest: 0,
    totalCompleted: 0,
    results: new Map(),
    groupResults: [],
    startTime: 0,
    report: null,
  });

  const [projectMappings, setProjectMappings] = useState<ProjectMapping[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [cleanedUp, setCleanedUp] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState<string | null>(null);

  const createLLMProvider = useCallback((type: 'openai' | 'claude' | 'gemini-text' | 'qwen-text' | 'inworld') => {
    return createLLMProviderFactory(type);
  }, []);

  // ─── CLEANUP OLD TEST PROJECTS ───────────────────────────────────────

  const cleanupTestProjects = useCallback(() => {
    const existingProjects = storageProjects.getAll();
    const testProjects = existingProjects.filter(p => p.name.startsWith(TEST_PROJECT_PREFIX));
    for (const p of testProjects) {
      deleteProject(p.id);
      // Clear from both storages to ensure complete cleanup
      chatStorage.clear(p.id);
      testStorage.clear(p.id);
    }
    // Also clear all test storage to be safe
    testStorage.clearAll();
    setCleanedUp(true);
  }, [deleteProject]);

  // ─── CREATE TEST PROJECTS ────────────────────────────────────────────

  const createTestProjects = useCallback((): ProjectMapping[] => {
    const mappings: ProjectMapping[] = [];

    for (const group of TEST_GROUPS) {
      const project = createProject(`${TEST_PROJECT_PREFIX}${group.name}`);
      mappings.push({ groupId: group.id, projectId: project.id });
    }

    setProjectMappings(mappings);
    return mappings;
  }, [createProject]);

  // ─── SAVE TEST MESSAGES ────────────────────────────────────────────────
  // Writes to BOTH isolated test storage (for runner metadata) AND production
  // chatStorage (so messages are visible when clicking "open chat").

  const saveTestMessages = useCallback(async (
    projectId: string,
    test: ComplianceTestCase,
    result: TestResult,
  ) => {
    const existing = testStorage.load(projectId);
    const now = Date.now();

    const userContent = test.mode === 'checker'
      ? `[CHECKER] ${test.description}\n\ntest content:\n${test.testContent ?? ''}`
      : test.prompt;

    const statusLabel = result.status.toUpperCase();
    const scoreStr = `${Math.round(result.score * 100)}%`;
    const assistantContent = `**[${statusLabel}] score: ${scoreStr}** | ${test.id}: ${test.description}\n\n${result.actualOutput || '(empty output)'}`;

    const userMsg = {
      id: generateId(),
      role: 'user' as const,
      content: userContent,
      timestamp: now,
    };

    const assistantMsg = {
      id: generateId(),
      role: 'assistant' as const,
      content: assistantContent,
      timestamp: now + 1,
      testMetadata: {
        testId: result.testId,
        status: result.status,
        score: result.score,
        notes: result.notes,
        failedPatterns: result.failedPatterns,
        failPatternMatches: result.failPatternMatches,
      },
    };

    // 1. Isolated test storage (runner UI metadata)
    testStorage.save(projectId, [...existing, userMsg, assistantMsg]);

    // 2. Production chatStorage so chats are visible in the main UI
    const existingChat = chatStorage.load(projectId);
    const chatUserMsg: ChatMessage = {
      id: generateMessageId('user'),
      role: 'user',
      content: userContent,
      timestamp: now,
      type: 'text',
      sourceMode: 'copy' as ChatMode,
    };
    const chatAssistantMsg: ChatMessage = {
      id: generateMessageId('ai'),
      role: 'assistant',
      content: assistantContent,
      timestamp: now + 1,
      type: 'text',
      sourceMode: 'copy' as ChatMode,
      parentMessageId: chatUserMsg.id,
    };
    await chatStorage.save(projectId, [...existingChat, chatUserMsg, chatAssistantMsg]);
    chatStorage.flush();
  }, []);

  // ─── RUN ALL TESTS ──────────────────────────────────────────────────

  const runAllTests = useCallback(async () => {
    cancelRef.current = false;

    cleanupTestProjects();
    await new Promise(r => setTimeout(r, 100));

    const mappings = createTestProjects();
    const startTime = Date.now();

    setState(prev => ({
      ...prev,
      status: 'running',
      currentGroup: 0,
      currentTest: 0,
      totalCompleted: 0,
      results: new Map(),
      groupResults: [],
      startTime,
      report: null,
    }));

    const allGroupResults: GroupResult[] = [];
    const allResults = new Map<string, TestResult>();
    let totalCompleted = 0;

    for (let gi = 0; gi < TEST_GROUPS.length; gi++) {
      if (cancelRef.current) break;
      const group = TEST_GROUPS[gi];
      const mapping = mappings.find(m => m.groupId === group.id);
      const projectId = mapping?.projectId ?? '';
      const testResults: TestResult[] = [];

      for (let ti = 0; ti < group.tests.length; ti++) {
        if (cancelRef.current) break;
        const test = group.tests[ti];

        setState(prev => ({
          ...prev,
          currentGroup: gi,
          currentTest: ti,
        }));

        const result = await evaluateTest(
          test,
          test.mode === 'generation' ? createLLMProvider : undefined,
        );

        if (test.mode === 'generation' && result.status !== 'error') {
          const syncService = getSyncService();
          syncService?.logAnalyticsEvent({
            eventType: 'generation',
            ecosystem: (test.context.ecosystem ?? 'connectivity'),
            channel: (test.context.channel ?? 'customer_care_chat') as string,
            persona: 'compliance-test',
            trustScore: result.score * 100,
            violationCount: result.failPatternMatches.length,
            llmProvider: 'openai',
            timestamp: Date.now(),
            responseTimeMs: result.durationMs,
            wasRegeneration: false,
          });
        }

        testResults.push(result);
        allResults.set(result.testId, result);
        totalCompleted++;

        await saveTestMessages(projectId, test, result);

        setState(prev => ({
          ...prev,
          totalCompleted,
          results: new Map(allResults),
        }));
      }

      const passCount = testResults.filter(r => r.status === 'pass').length;
      const failCount = testResults.filter(r => r.status === 'fail').length;
      const warnCount = testResults.filter(r => r.status === 'warn').length;
      const errorCount = testResults.filter(r => r.status === 'error').length;
      const avgScore = testResults.length > 0
        ? testResults.reduce((s, r) => s + r.score, 0) / testResults.length
        : 0;

      const groupResult: GroupResult = {
        groupId: group.id,
        groupName: group.name,
        tests: testResults,
        passCount,
        failCount,
        warnCount,
        errorCount,
        score: Math.round(avgScore * 100) / 100,
      };

      allGroupResults.push(groupResult);
      setState(prev => ({
        ...prev,
        groupResults: [...allGroupResults],
      }));
    }

    const totals = allGroupResults.reduce(
      (acc, g) => ({
        pass: acc.pass + g.passCount,
        fail: acc.fail + g.failCount,
        warn: acc.warn + g.warnCount,
        error: acc.error + g.errorCount,
      }),
      { pass: 0, fail: 0, warn: 0, error: 0 },
    );
    const totalTests = allGroupResults.reduce((s, g) => s + g.tests.length, 0);
    const overallScore = totalTests > 0
      ? allGroupResults.reduce((s, g) => s + g.tests.reduce((ts, t) => ts + t.score, 0), 0) / totalTests
      : 0;

    const report: FullReport = {
      totalTests,
      passCount: totals.pass,
      failCount: totals.fail,
      warnCount: totals.warn,
      errorCount: totals.error,
      overallScore: Math.round(overallScore * 100) / 100,
      groups: allGroupResults,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };

    setState(prev => ({
      ...prev,
      status: cancelRef.current ? 'cancelled' : 'done',
      report,
      groupResults: allGroupResults,
    }));
  }, [createLLMProvider, cleanupTestProjects, createTestProjects, saveTestMessages]);

  const handleCancel = useCallback(() => {
    cancelRef.current = true;
  }, []);

  const handleDownloadReport = useCallback(() => {
    if (!state.report) return;
    const md = generateMarkdownReport(state.report);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-report-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state.report]);

  const handleNavigateToProject = useCallback((groupId: string) => {
    const mapping = projectMappings.find(m => m.groupId === groupId);
    if (mapping) {
      setActiveProject(mapping.projectId);
      navigate('/');
    }
  }, [projectMappings, setActiveProject, navigate]);

  const handleDeleteAllTestProjects = useCallback(() => {
    // Count how many projects will be deleted
    const existingProjects = storageProjects.getAll();
    const testProjectCount = existingProjects.filter(p => p.name.startsWith(TEST_PROJECT_PREFIX)).length;
    
    cleanupTestProjects();
    setProjectMappings([]);
    setState({
      status: 'idle',
      currentGroup: 0,
      currentTest: 0,
      totalCompleted: 0,
      results: new Map(),
      groupResults: [],
      startTime: 0,
      report: null,
    });
    setShowDeleteConfirm(false);
    
    // Show success toast
    const message = testProjectCount > 0 
      ? `Deleted ${testProjectCount} test project${testProjectCount > 1 ? 's' : ''}`
      : 'No test projects to delete';
    globalToastQueue.add({
      title: message,
      appearance: 'neutral',
      showIcon: false,
      closable: true,
    }, { timeout: 5000 });
  }, [cleanupTestProjects]);

  // ─── COMPUTED VALUES ─────────────────────────────────────────────────

  const progress = ALL_TESTS.length > 0
    ? (state.totalCompleted / ALL_TESTS.length) * 100
    : 0;

  const currentGroupName = TEST_GROUPS[state.currentGroup]?.name ?? '';
  const currentTestDesc = TEST_GROUPS[state.currentGroup]?.tests[state.currentTest]?.description ?? '';

  // ─── RENDER ──────────────────────────────────────────────────────────

  // Status color helpers using theme semantic colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return theme.semantic.positive;
      case 'fail': return theme.semantic.negative;
      case 'warn': return theme.semantic.warning;
      default: return theme.text.low;
    }
  };

  const getScoreBackground = (score: number) => {
    if (score >= 0.9) return theme.isLight ? '#E8F5E9' : '#1B3D2F';
    if (score >= 0.7) return theme.isLight ? '#FFF3E0' : '#3D2E1B';
    return theme.isLight ? '#FFEBEE' : '#3D1B1B';
  };

  const getScoreTextColor = (score: number) => {
    if (score >= 0.9) return theme.semantic.positive;
    if (score >= 0.7) return theme.semantic.warning;
    return theme.semantic.negative;
  };

  return (
    <div 
      style={{ 
        padding: 24, 
        maxWidth: 1200, 
        margin: '0 auto', 
        height: '100vh', 
        overflowY: 'auto',
        backgroundColor: theme.background.ghost,
        color: theme.text.high,
      }}
      className="scrollable-container"
    >
      {/* Header with close button */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Title size="L" as="h1" weight="high" color="high">
            Compliance test runner
          </Title>
          <p 
            style={{
              fontFamily: '"JioType Var"',
              fontWeight: 400,
              fontSize: '12px',
              lineHeight: 1.3,
              fontVariationSettings: '"opsz" 24',
              color: theme.text.low,
              margin: 0,
              marginTop: '6px',
            }}
          >
            {ALL_TESTS.length} tests across {TEST_GROUPS.length} groups
          </p>
        </div>
        <ActionButton
          icon={<DSIcon name="IcClose" size="S" style={{ color: theme.text.medium }} />}
          label="Close"
          onClick={() => navigate('/')}
          size={36}
        />
      </div>

      {/* ── Controls ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {state.status === 'idle' && (
          <Button
            onPress={runAllTests}
            appearance="primary"
            attention="high"
            size="S"
          >
            Run all tests
          </Button>
        )}
        {state.status === 'running' && (
          <Button
            onPress={handleCancel}
            appearance="primary"
            size="S"
            style={{ backgroundColor: theme.semantic.negative }}
          >
            Cancel
          </Button>
        )}
        {state.status === 'done' && (
          <>
            <Button
              onPress={runAllTests}
              appearance="primary"
              attention="high"
              size="S"
            >
              Re-run all tests
            </Button>
            <Button
              onPress={handleDownloadReport}
              appearance="neutral"
              attention="high"
              size="S"
              style={{ 
                backgroundColor: theme.semantic.positive, 
                color: '#fff',
                border: 'none',
              }}
            >
              Download report (.md)
            </Button>
            <Button
              onPress={() => setShowReport(!showReport)}
              appearance="neutral"
              attention="medium"
              size="S"
            >
              {showReport ? 'Hide' : 'Show'} full report
            </Button>
          </>
        )}
        {(state.status === 'idle' || state.status === 'done') && (
          <Button
            onPress={() => setShowDeleteConfirm(true)}
            appearance="neutral"
            attention="low"
            size="S"
          >
            Delete all test projects
          </Button>
        )}
      </div>

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            style={{ backgroundColor: theme.background.ghost }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-2">
              <Title size="L" as="h2" weight="high" color="high">
                Delete all test projects?
              </Title>
            </div>
            
            {/* Body */}
            <div className="px-6 py-4">
              <Text size="S" color="medium">
                This will remove all projects with the "[test]" prefix from your workspace.
              </Text>
            </div>
            
            {/* Footer */}
            <div className="px-6 pt-2 pb-6 flex justify-end gap-3">
              <Button
                onPress={() => setShowDeleteConfirm(false)}
                appearance="neutral"
                attention="low"
                size="S"
              >
                Cancel
              </Button>
              <Button
                onPress={handleDeleteAllTestProjects}
                appearance="negative"
                attention="high"
                size="S"
              >
                Yes, delete all
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── DS Toast Region ── */}
      <ToastRegion queue={globalToastQueue} position="bottom" size="S" />

      {/* ── Progress ── */}
      {state.status === 'running' && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text size="S" color="medium">
              {state.totalCompleted} / {ALL_TESTS.length} ({Math.round(progress)}%)
            </Text>
            <Text size="S" color="medium">
              {currentGroupName}
            </Text>
          </div>
          <div style={{ 
            height: 8, 
            background: theme.stroke.low, 
            borderRadius: 4, 
            overflow: 'hidden' 
          }}>
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background: theme.accent,
                borderRadius: 4,
                transition: 'width 0.3s',
              }}
            />
          </div>
          <Text size="XS" color="low" style={{ marginTop: 4 }}>
            running: {currentTestDesc}
          </Text>
        </div>
      )}

      {/* ── Summary Cards ── */}
      {(state.status === 'done' || state.status === 'running') && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'total', value: state.totalCompleted, color: theme.text.high },
            { label: 'pass', value: Array.from(state.results.values()).filter(r => r.status === 'pass').length, color: theme.semantic.positive },
            { label: 'fail', value: Array.from(state.results.values()).filter(r => r.status === 'fail').length, color: theme.semantic.negative },
            { label: 'warn', value: Array.from(state.results.values()).filter(r => r.status === 'warn').length, color: theme.semantic.warning },
            { label: 'error', value: Array.from(state.results.values()).filter(r => r.status === 'error').length, color: theme.text.low },
          ].map(card => (
            <div
              key={card.label}
              style={{
                padding: 16, 
                borderRadius: 12, 
                textAlign: 'center',
                border: `1px solid ${theme.stroke.medium}`, 
                background: theme.background.ghost,
              }}
            >
              <div style={{ 
                fontSize: chatTypography.h1.fontSize, 
                fontWeight: chatTypography.h1.fontWeight, 
                color: card.color 
              }}>
                {card.value}
              </div>
              <Text size="XS" color="medium" style={{ textTransform: 'uppercase' }}>
                {card.label}
              </Text>
            </div>
          ))}
        </div>
      )}

      {/* ── Overall Score ── */}
      {state.report && (
        <div style={{
          padding: 20, 
          borderRadius: 12, 
          marginBottom: 24, 
          textAlign: 'center',
          background: getScoreBackground(state.report.overallScore),
          border: `2px solid ${getScoreTextColor(state.report.overallScore)}`,
        }}>
          <div style={{ 
            fontSize: '36px', 
            fontWeight: 700, 
            color: getScoreTextColor(state.report.overallScore) 
          }}>
            {Math.round(state.report.overallScore * 100)}%
          </div>
          <Text size="M" color="high">
            overall compliance score
            {state.report.overallScore >= 0.9 ? ' -- target MET' : ' -- below 90% target'}
          </Text>
          <Text size="S" color="medium" style={{ marginTop: 4 }}>
            completed in {(state.report.durationMs / 1000).toFixed(1)}s
          </Text>
        </div>
      )}

      {/* ── Group Table ── */}
      {state.groupResults.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <Title size="S" as="h2" weight="high" color="high" style={{ marginBottom: 12 }}>
            group scores
          </Title>
          <div style={{ 
            border: `1px solid ${theme.stroke.medium}`, 
            borderRadius: 12, 
            overflow: 'hidden',
            background: theme.background.ghost,
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ 
                  borderBottom: `2px solid ${theme.stroke.medium}`,
                  background: theme.background.subtle,
                }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: chatTypography.bodySm.fontSize, fontWeight: 600, color: theme.text.medium }}>group</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px', fontSize: chatTypography.bodySm.fontSize, fontWeight: 600, color: theme.text.medium }}>tests</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px', fontSize: chatTypography.bodySm.fontSize, fontWeight: 600, color: theme.text.medium }}>pass</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px', fontSize: chatTypography.bodySm.fontSize, fontWeight: 600, color: theme.text.medium }}>fail</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px', fontSize: chatTypography.bodySm.fontSize, fontWeight: 600, color: theme.text.medium }}>warn</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px', fontSize: chatTypography.bodySm.fontSize, fontWeight: 600, color: theme.text.medium }}>score</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px', fontSize: chatTypography.bodySm.fontSize, fontWeight: 600, color: theme.text.medium }}>view</th>
                </tr>
              </thead>
              <tbody>
                {state.groupResults.map(g => (
                  <tr
                    key={g.groupId}
                    style={{
                      borderBottom: `1px solid ${theme.stroke.low}`,
                      cursor: 'pointer',
                      background: selectedGroup === g.groupId ? theme.background.bold : 'transparent',
                      transition: 'background-color 150ms',
                    }}
                    onClick={() => setSelectedGroup(selectedGroup === g.groupId ? null : g.groupId)}
                    onMouseEnter={(e) => {
                      if (selectedGroup !== g.groupId) {
                        e.currentTarget.style.backgroundColor = theme.background.subtle;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedGroup !== g.groupId) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontSize: chatTypography.bodySm.fontSize, color: theme.text.high }}>{g.groupName}</td>
                    <td style={{ textAlign: 'center', padding: '12px 16px', fontSize: chatTypography.bodySm.fontSize, color: theme.text.medium }}>{g.tests.length}</td>
                    <td style={{ textAlign: 'center', padding: '12px 16px', fontSize: chatTypography.bodySm.fontSize, color: theme.semantic.positive }}>{g.passCount}</td>
                    <td style={{ textAlign: 'center', padding: '12px 16px', fontSize: chatTypography.bodySm.fontSize, color: theme.semantic.negative }}>{g.failCount}</td>
                    <td style={{ textAlign: 'center', padding: '12px 16px', fontSize: chatTypography.bodySm.fontSize, color: theme.semantic.warning }}>{g.warnCount}</td>
                    <td style={{ textAlign: 'center', padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-block', 
                        padding: '4px 10px', 
                        borderRadius: 6,
                        fontSize: chatTypography.caption.fontSize,
                        fontWeight: 600,
                        background: getScoreBackground(g.score),
                        color: getScoreTextColor(g.score),
                      }}>
                        {Math.round(g.score * 100)}%
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px 16px' }}>
                      <Button
                        onPress={(e) => { e?.stopPropagation?.(); handleNavigateToProject(g.groupId); }}
                        appearance="neutral"
                        attention="low"
                        size="XS"
                      >
                        open chat
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Expanded Group Detail ── */}
      {selectedGroup && (() => {
        const group = state.groupResults.find(g => g.groupId === selectedGroup);
        if (!group) return null;
        return (
          <div style={{ 
            marginBottom: 24, 
            padding: 16, 
            borderRadius: 12, 
            border: `1px solid ${theme.stroke.medium}`, 
            background: theme.background.subtle 
          }}>
            <Title size="XS" as="h3" weight="high" color="high" style={{ marginBottom: 12 }}>
              {group.groupName} -- detail
            </Title>
            <div style={{ 
              border: `1px solid ${theme.stroke.low}`, 
              borderRadius: 8, 
              overflow: 'hidden',
              background: theme.background.ghost,
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ 
                    borderBottom: `2px solid ${theme.stroke.medium}`,
                    background: theme.background.subtle,
                  }}>
                    <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: chatTypography.caption.fontSize, fontWeight: 600, color: theme.text.medium }}>id</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: chatTypography.caption.fontSize, fontWeight: 600, color: theme.text.medium }}>description</th>
                    <th style={{ textAlign: 'center', padding: '8px 12px', fontSize: chatTypography.caption.fontSize, fontWeight: 600, color: theme.text.medium }}>status</th>
                    <th style={{ textAlign: 'center', padding: '8px 12px', fontSize: chatTypography.caption.fontSize, fontWeight: 600, color: theme.text.medium }}>score</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: chatTypography.caption.fontSize, fontWeight: 600, color: theme.text.medium }}>notes</th>
                  </tr>
                </thead>
                <tbody>
                  {group.tests.map(t => (
                    <tr key={t.testId} style={{ borderBottom: `1px solid ${theme.stroke.low}` }}>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono, monospace)', fontSize: chatTypography.caption.fontSize, color: theme.text.medium }}>{t.testId}</td>
                      <td style={{ padding: '8px 12px', fontSize: chatTypography.caption.fontSize, color: theme.text.high }}>{t.description}</td>
                      <td style={{ textAlign: 'center', padding: '8px 12px' }}>
                        <span style={{
                          display: 'inline-block', 
                          padding: '2px 8px', 
                          borderRadius: 4, 
                          fontSize: chatTypography.label.fontSize, 
                          fontWeight: 600,
                          background: t.status === 'pass' 
                            ? (theme.isLight ? '#E8F5E9' : '#1B3D2F')
                            : t.status === 'fail' 
                              ? (theme.isLight ? '#FFEBEE' : '#3D1B1B')
                              : t.status === 'warn' 
                                ? (theme.isLight ? '#FFF3E0' : '#3D2E1B')
                                : theme.background.bold,
                          color: getStatusColor(t.status),
                        }}>
                          {t.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', padding: '8px 12px', fontSize: chatTypography.caption.fontSize, color: theme.text.medium }}>{Math.round(t.score * 100)}%</td>
                      <td style={{ padding: '8px 12px', fontSize: chatTypography.caption.fontSize, color: theme.text.low, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.notes.join('; ') || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* ── Full Report ── */}
      {showReport && state.report && (
        <div style={{ marginBottom: 24 }}>
          <Title size="S" as="h2" weight="high" color="high" style={{ marginBottom: 12 }}>
            full markdown report
          </Title>
          <pre style={{
            background: theme.isLight ? '#1C1C1E' : theme.background.bold, 
            color: theme.isLight ? '#E5E5EA' : theme.text.high, 
            padding: 20, 
            borderRadius: 12,
            overflow: 'auto', 
            maxHeight: 600, 
            fontSize: chatTypography.caption.fontSize, 
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap', 
            wordBreak: 'break-word',
            border: `1px solid ${theme.stroke.medium}`,
          }}>
            {generateMarkdownReport(state.report)}
          </pre>
        </div>
      )}
    </div>
  );
}
