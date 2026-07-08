import {
  StateGraph,
  MessagesAnnotation,
  MemorySaver,
  START,
  END,
} from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { AIMessage, SystemMessage, trimMessages } from '@langchain/core/messages';
import { model } from './model.js';
import { allTools } from './tools/index.js';

const modelWithTools = model.bindTools(allTools);
const toolNode = new ToolNode(allTools);

function systemPrompt(): SystemMessage {
  const today = new Date().toISOString().slice(0, 10);
  return new SystemMessage(
    [
      'You are the assistant for a personal expense-manager app.',
      `Today is ${today}. Always use YYYY-MM-DD for dates.`,
      "Use the tools to read and modify the user's data.",
      'Never invent category ids or transaction ids — look them up with list_transactions first.',
      'Propose only one write action at a time. Ask for any missing details before acting.',
      'Never use currency symbols or codes (₹, $, Rs., INR) — write amounts as plain numbers, e.g. "you spent 1250 this month".',
      'Be concise.',
    ].join(' '),
  );
}

/**
 * Groq occasionally rejects a completion with `tool_use_failed` (HTTP 400) when
 * the model emits a malformed tool-call string instead of JSON. The failure is
 * stochastic — the same request usually succeeds on retry — but 400s are not
 * retried by the SDK or LangChain, so we retry here.
 */
function isToolUseFailed(err: unknown): boolean {
  const e = err as { error?: { error?: { code?: string } }; message?: string };
  return (
    e?.error?.error?.code === 'tool_use_failed' ||
    (typeof e?.message === 'string' && e.message.includes('tool_use_failed'))
  );
}

// Only the most recent messages are sent to the model — keeps long chats fast
// and under Groq's free-tier token budget. The checkpointer still stores the
// full thread; this caps the context window, not the stored history.
const HISTORY_WINDOW = 10;

async function agentNode(state: typeof MessagesAnnotation.State) {
  // `startOn: 'human'` keeps tool_call/tool_result pairs intact at the cut —
  // an orphaned tool result at the start of the window would be a 400.
  const recent = await trimMessages(state.messages, {
    maxTokens: HISTORY_WINDOW,
    tokenCounter: (msgs) => msgs.length,
    strategy: 'last',
    startOn: 'human',
    includeSystem: false,
  });
  // If the current turn alone exceeds the window (long tool loop), trimming
  // would drop its human message — fall back to the full history for safety.
  const input = [systemPrompt(), ...(recent.length > 0 ? recent : state.messages)];
  const maxAttempts = 3;
  for (let attempt = 1; ; attempt += 1) {
    try {
      const response = await modelWithTools.invoke(input);
      return { messages: [response] };
    } catch (err) {
      if (!isToolUseFailed(err) || attempt >= maxAttempts) throw err;
    }
  }
}

function routeAfterAgent(state: typeof MessagesAnnotation.State) {
  const last = state.messages.at(-1);
  if (last instanceof AIMessage && (last.tool_calls?.length ?? 0) > 0) return 'tools';
  return END;
}

// MemorySaver: state lives in-process. Swap for PostgresSaver later (one line).
export const checkpointer = new MemorySaver();

export const graph = new StateGraph(MessagesAnnotation)
  .addNode('agent', agentNode)
  .addNode('tools', toolNode)
  .addEdge(START, 'agent')
  .addConditionalEdges('agent', routeAfterAgent, ['tools', END])
  .addEdge('tools', 'agent')
  .compile({ checkpointer });
