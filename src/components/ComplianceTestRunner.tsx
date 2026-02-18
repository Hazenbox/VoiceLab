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
import { TEST_GROUPS, ALL_TESTS, type TestGroup, type ComplianceTestCase } from '../tests/complianceTestCases';
import { evaluateTest, type TestResult, type GroupResult, type FullReport } from '../tests/complianceEvaluator';
import { generateMarkdownReport } from '../tests/generateComplianceReport';
import { storageProjects, generateId } from '../services/storage';
import { chatStorage } from '../services/chatStorage';
import type { Project, ChatMessage } from '../types';
import { useProject } from '../context/ProjectContext';
import { useUIStore } from '../stores/uiStore';
import { createLLMProvider as createLLMProviderFactory } from '../services/providers/llm';

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

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function ComplianceTestRunner() {
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

  const createLLMProvider = useCallback((type: 'openai' | 'claude' | 'gemini-text' | 'qwen-text' | 'inworld') => {
    return createLLMProviderFactory(type);
  }, []);

  // ─── CLEANUP OLD TEST PROJECTS ───────────────────────────────────────

  const cleanupTestProjects = useCallback(() => {
    const existingProjects = storageProjects.getAll();
    const testProjects = existingProjects.filter(p => p.name.startsWith(TEST_PROJECT_PREFIX));
    for (const p of testProjects) {
      deleteProject(p.id);
      chatStorage.clear(p.id);
    }
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

  // ─── SAVE TEST MESSAGE TO CHAT ───────────────────────────────────────

  const saveTestMessages = useCallback(async (
    projectId: string,
    test: ComplianceTestCase,
    result: TestResult,
  ) => {
    const existing = chatStorage.load(projectId);
    const now = Date.now();

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: test.mode === 'checker'
        ? `[CHECKER] ${test.description}\n\ntest content:\n${test.testContent ?? ''}`
        : test.prompt,
      timestamp: now,
      type: 'text',
      sourceMode: 'copy',
    };

    const statusLabel = result.status.toUpperCase();
    const scoreStr = `${Math.round(result.score * 100)}%`;
    const notes = result.notes.length > 0 ? `\n\nnotes: ${result.notes.join('; ')}` : '';
    const patterns = result.failPatternMatches.length > 0
      ? `\n\nforbidden patterns found: ${result.failPatternMatches.join(', ')}`
      : '';
    const missing = result.failedPatterns.length > 0
      ? `\nmissing expected patterns: ${result.failedPatterns.join(', ')}`
      : '';

    const assistantMsg: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: `**[${statusLabel}] score: ${scoreStr}** | ${test.id}: ${test.description}\n\n${result.actualOutput || '(empty output)'}${notes}${patterns}${missing}`,
      timestamp: now + 1,
      type: 'text',
      sourceMode: 'copy',
      parentMessageId: userMsg.id,
    };

    await chatStorage.save(projectId, [...existing, userMsg, assistantMsg]);
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
    }
  }, [projectMappings, setActiveProject]);

  // ─── COMPUTED VALUES ─────────────────────────────────────────────────

  const progress = ALL_TESTS.length > 0
    ? (state.totalCompleted / ALL_TESTS.length) * 100
    : 0;

  const currentGroupName = TEST_GROUPS[state.currentGroup]?.name ?? '';
  const currentTestDesc = TEST_GROUPS[state.currentGroup]?.tests[state.currentTest]?.description ?? '';

  // ─── RENDER ──────────────────────────────────────────────────────────

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif', height: '100vh', overflowY: 'auto' }}>
      <button
        onClick={() => useUIStore.getState().setActiveView('main')}
        style={{
          padding: '6px 14px', background: 'none', color: '#0066FF',
          border: '1px solid #0066FF', borderRadius: 6, cursor: 'pointer',
          fontSize: 13, marginBottom: 16,
        }}
      >
        back to main
      </button>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>compliance test runner</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>{ALL_TESTS.length} tests across {TEST_GROUPS.length} groups</p>

      {/* ── Controls ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {state.status === 'idle' && (
          <button
            onClick={runAllTests}
            style={{
              padding: '10px 24px', background: '#0066FF', color: '#fff',
              border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500,
            }}
          >
            run all tests
          </button>
        )}
        {state.status === 'running' && (
          <button
            onClick={handleCancel}
            style={{
              padding: '10px 24px', background: '#FF3B30', color: '#fff',
              border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500,
            }}
          >
            cancel
          </button>
        )}
        {state.status === 'done' && (
          <>
            <button
              onClick={runAllTests}
              style={{
                padding: '10px 24px', background: '#0066FF', color: '#fff',
                border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500,
              }}
            >
              re-run all tests
            </button>
            <button
              onClick={handleDownloadReport}
              style={{
                padding: '10px 24px', background: '#34C759', color: '#fff',
                border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500,
              }}
            >
              download report (.md)
            </button>
            <button
              onClick={() => setShowReport(!showReport)}
              style={{
                padding: '10px 24px', background: '#8E8E93', color: '#fff',
                border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500,
              }}
            >
              {showReport ? 'hide' : 'show'} full report
            </button>
          </>
        )}
      </div>

      {/* ── Progress ── */}
      {state.status === 'running' && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 14, color: '#666' }}>
              {state.totalCompleted} / {ALL_TESTS.length} ({Math.round(progress)}%)
            </span>
            <span style={{ fontSize: 14, color: '#666' }}>
              {currentGroupName}
            </span>
          </div>
          <div style={{ height: 8, background: '#E5E5EA', borderRadius: 4, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background: '#0066FF',
                borderRadius: 4,
                transition: 'width 0.3s',
              }}
            />
          </div>
          <p style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
            running: {currentTestDesc}
          </p>
        </div>
      )}

      {/* ── Summary Cards ── */}
      {(state.status === 'done' || state.status === 'running') && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'total', value: state.totalCompleted, color: '#1C1C1E' },
            { label: 'pass', value: Array.from(state.results.values()).filter(r => r.status === 'pass').length, color: '#34C759' },
            { label: 'fail', value: Array.from(state.results.values()).filter(r => r.status === 'fail').length, color: '#FF3B30' },
            { label: 'warn', value: Array.from(state.results.values()).filter(r => r.status === 'warn').length, color: '#FF9500' },
            { label: 'error', value: Array.from(state.results.values()).filter(r => r.status === 'error').length, color: '#8E8E93' },
          ].map(card => (
            <div
              key={card.label}
              style={{
                padding: 16, borderRadius: 12, textAlign: 'center',
                border: '1px solid #E5E5EA', background: '#fff',
              }}
            >
              <div style={{ fontSize: 28, fontWeight: 700, color: card.color }}>{card.value}</div>
              <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase' }}>{card.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Overall Score ── */}
      {state.report && (
        <div style={{
          padding: 20, borderRadius: 12, marginBottom: 24, textAlign: 'center',
          background: state.report.overallScore >= 0.9 ? '#E8F5E9' : state.report.overallScore >= 0.7 ? '#FFF3E0' : '#FFEBEE',
          border: `2px solid ${state.report.overallScore >= 0.9 ? '#4CAF50' : state.report.overallScore >= 0.7 ? '#FF9800' : '#F44336'}`,
        }}>
          <div style={{ fontSize: 36, fontWeight: 700 }}>
            {Math.round(state.report.overallScore * 100)}%
          </div>
          <div style={{ fontSize: 14, color: '#333' }}>
            overall compliance score
            {state.report.overallScore >= 0.9 ? ' -- target MET' : ' -- below 90% target'}
          </div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            completed in {(state.report.durationMs / 1000).toFixed(1)}s
          </div>
        </div>
      )}

      {/* ── Group Table ── */}
      {state.groupResults.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>group scores</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E5E5EA' }}>
                <th style={{ textAlign: 'left', padding: '8px 12px' }}>group</th>
                <th style={{ textAlign: 'center', padding: '8px 12px' }}>tests</th>
                <th style={{ textAlign: 'center', padding: '8px 12px' }}>pass</th>
                <th style={{ textAlign: 'center', padding: '8px 12px' }}>fail</th>
                <th style={{ textAlign: 'center', padding: '8px 12px' }}>warn</th>
                <th style={{ textAlign: 'center', padding: '8px 12px' }}>score</th>
                <th style={{ textAlign: 'center', padding: '8px 12px' }}>view</th>
              </tr>
            </thead>
            <tbody>
              {state.groupResults.map(g => (
                <tr
                  key={g.groupId}
                  style={{
                    borderBottom: '1px solid #E5E5EA',
                    cursor: 'pointer',
                    background: selectedGroup === g.groupId ? '#F2F2F7' : undefined,
                  }}
                  onClick={() => setSelectedGroup(selectedGroup === g.groupId ? null : g.groupId)}
                >
                  <td style={{ padding: '8px 12px' }}>{g.groupName}</td>
                  <td style={{ textAlign: 'center', padding: '8px 12px' }}>{g.tests.length}</td>
                  <td style={{ textAlign: 'center', padding: '8px 12px', color: '#34C759' }}>{g.passCount}</td>
                  <td style={{ textAlign: 'center', padding: '8px 12px', color: '#FF3B30' }}>{g.failCount}</td>
                  <td style={{ textAlign: 'center', padding: '8px 12px', color: '#FF9500' }}>{g.warnCount}</td>
                  <td style={{ textAlign: 'center', padding: '8px 12px', fontWeight: 600 }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                      background: g.score >= 0.9 ? '#E8F5E9' : g.score >= 0.7 ? '#FFF3E0' : '#FFEBEE',
                      color: g.score >= 0.9 ? '#2E7D32' : g.score >= 0.7 ? '#E65100' : '#C62828',
                    }}>
                      {Math.round(g.score * 100)}%
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', padding: '8px 12px' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleNavigateToProject(g.groupId); }}
                      style={{
                        padding: '4px 10px', fontSize: 12, border: '1px solid #ccc',
                        borderRadius: 4, cursor: 'pointer', background: '#fff',
                      }}
                    >
                      open chat
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Expanded Group Detail ── */}
      {selectedGroup && (() => {
        const group = state.groupResults.find(g => g.groupId === selectedGroup);
        if (!group) return null;
        return (
          <div style={{ marginBottom: 24, padding: 16, borderRadius: 12, border: '1px solid #E5E5EA', background: '#FAFAFA' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>{group.groupName} -- detail</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E5E5EA' }}>
                  <th style={{ textAlign: 'left', padding: '6px 8px' }}>id</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px' }}>description</th>
                  <th style={{ textAlign: 'center', padding: '6px 8px' }}>status</th>
                  <th style={{ textAlign: 'center', padding: '6px 8px' }}>score</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px' }}>notes</th>
                </tr>
              </thead>
              <tbody>
                {group.tests.map(t => (
                  <tr key={t.testId} style={{ borderBottom: '1px solid #E5E5EA' }}>
                    <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontSize: 12 }}>{t.testId}</td>
                    <td style={{ padding: '6px 8px' }}>{t.description}</td>
                    <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                        background: t.status === 'pass' ? '#E8F5E9' : t.status === 'fail' ? '#FFEBEE' : t.status === 'warn' ? '#FFF3E0' : '#F5F5F5',
                        color: t.status === 'pass' ? '#2E7D32' : t.status === 'fail' ? '#C62828' : t.status === 'warn' ? '#E65100' : '#666',
                      }}>
                        {t.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', padding: '6px 8px' }}>{Math.round(t.score * 100)}%</td>
                    <td style={{ padding: '6px 8px', fontSize: 12, color: '#666', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.notes.join('; ') || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* ── Full Report ── */}
      {showReport && state.report && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>full markdown report</h2>
          <pre style={{
            background: '#1C1C1E', color: '#E5E5EA', padding: 20, borderRadius: 12,
            overflow: 'auto', maxHeight: 600, fontSize: 13, lineHeight: 1.5,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {generateMarkdownReport(state.report)}
          </pre>
        </div>
      )}
    </div>
  );
}
