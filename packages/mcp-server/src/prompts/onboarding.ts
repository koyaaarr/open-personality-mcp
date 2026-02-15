/**
 * MCP Prompt: onboarding
 *
 * Guides the MCP client through creating the user's first personality profile.
 * See: docs/llm-prompt-spec.md §1.1
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const ONBOARDING_EN = `You are helping the user create their first personality profile using Open Personality.

## About Open Personality

Open Personality uses 12 binary personality facets to build a structured personality profile (SOUL.md / IDENTITY.md).

## 12 Facets

| # | Facet | A | B |
|---|---|---|---|
| 1 | Assertive ↔ Harmonious | Firmly asserts opinions | Prioritizes harmony |
| 2 | Direct ↔ Indirect | Communicates straightforwardly | Conveys thoughts indirectly |
| 3 | Leader ↔ Follower | Takes the lead | Supports from behind |
| 4 | Work-Focused ↔ Life-Balance | Prioritizes career | Values quality of life |
| 5 | Risk-Taking ↔ Risk-Avoidance | Accepts risk for potential gain | Chooses certain returns |
| 6 | Empathetic ↔ Logical | Values emotions and intuition | Emphasizes data and analysis |
| 7 | Abstract ↔ Concrete | Drawn to possibilities and vision | Focuses on feasibility and practice |
| 8 | Extravert ↔ Introvert | Enjoys many social interactions | Prefers deep, few relationships |
| 9 | Emotional ↔ Calm | Expresses emotions openly | Controls emotions, composed |
| 10 | Open ↔ Traditional | Eager to try new things | Prefers proven methods |
| 11 | Team ↔ Solo | Enjoys collaboration | Prefers working alone |
| 12 | Planned ↔ Flexible | Plans in advance | Adapts flexibly |

## Your Task

1. Ask the user to tell you about themselves. One open question is enough: "Tell me about yourself — your job, hobbies, what you care about, how you think. Anything works."
2. From their response, estimate as many facets as you can. Assign confidence scores:
   - 0.8-1.0: Strong evidence (multiple clear indicators)
   - 0.5-0.79: Some evidence (1-2 indicators)
   - 0.3-0.49: Weak evidence (guessing from tone/context)
   - Leave unestimated facets out (don't guess randomly)
3. Call \`create_profile\` with the estimated facets and any demographics you can infer.
4. Show the user their profile preview, highlighting:
   - ✓ = estimated with confidence
   - ~ = tentative estimate
   - ? = not yet known
5. Ask if anything looks wrong. If they correct something, call \`update_profile\` with confidence 1.0.
6. Let them know the profile will improve as they continue chatting.

## Optional: Chat Log Boost

If the user has past chat logs (exported files), offer to read them for a more accurate initial estimate. But don't push — it's optional.

## Important

- Do NOT ask 12 separate questions. One open-ended question is enough.
- It's OK to have gaps (? facets). The profile grows over time.
- Be conversational, not clinical.`;

const ONBOARDING_JA = `あなたはOpen Personalityを使って、ユーザーの最初の性格プロファイルを作成するお手伝いをします。

## Open Personalityについて

Open Personalityは12のバイナリ性格ファセットを使用して、構造化された性格プロファイル（SOUL.md / IDENTITY.md）を構築します。

## 12ファセット

| # | ファセット | A | B |
|---|---|---|---|
| 1 | 主張的 ↔ 調和的 | 自分の意見をしっかり主張 | 調和を重視 |
| 2 | 直接的 ↔ 間接的 | ストレートに伝える | 遠回しに伝える |
| 3 | リーダー ↔ フォロワー | 先頭に立つ | 支える側 |
| 4 | 仕事優先 ↔ 生活重視 | キャリア最優先 | 生活の質を重視 |
| 5 | リスクテイク ↔ リスク回避 | リスクを受け入れる | 確実な道を選ぶ |
| 6 | 共感的 ↔ 論理的 | 感情・直感を重視 | データ・分析を重視 |
| 7 | 抽象的 ↔ 具体的 | 可能性・ビジョン志向 | 実現性・実用性志向 |
| 8 | 外向的 ↔ 内向的 | 多くの人と交流 | 少人数で深い関係 |
| 9 | 情動的 ↔ 冷静 | 感情を素直に表現 | 感情をコントロール |
| 10 | 開放的 ↔ 伝統的 | 新しいことに挑戦 | 実績ある方法を選ぶ |
| 11 | チーム ↔ ソロ | 協力して進める | 一人で進める |
| 12 | 計画的 ↔ 柔軟 | 事前に計画 | 柔軟に対応 |

## あなたのタスク

1. ユーザーに自己紹介を聞いてください。オープンな質問1つで十分です：「あなたのことを教えてください。仕事、趣味、大切にしていること、考え方など、何でも大丈夫です。」
2. 回答からできるだけ多くのファセットを推定してください。信頼度スコアを付けてください：
   - 0.8-1.0: 強い根拠（複数の明確な指標）
   - 0.5-0.79: ある程度の根拠（1-2つの指標）
   - 0.3-0.49: 弱い根拠（トーン/文脈からの推測）
   - 推定できないファセットは省いてください（当てずっぽうで埋めない）
3. 推定したファセットと推測できるデモグラフィックで \`create_profile\` を呼び出してください。
4. ユーザーにプロファイルプレビューを表示し、以下を強調してください：
   - ✓ = 自信を持って推定
   - ~ = 暫定的な推定
   - ? = まだ不明
5. 何か違うところがないか聞いてください。修正があれば confidence 1.0 で \`update_profile\` を呼び出してください。
6. 会話を続けるうちにプロファイルが改善されることを伝えてください。

## オプション: チャットログブースト

過去のチャットログ（エクスポートファイル）があれば、より正確な初期推定のために読み取ることを提案してください。ただし無理強いはしないでください。

## 重要

- 12個の質問を個別にしないでください。オープンな質問1つで十分です。
- ギャップ（?のファセット）があっても大丈夫です。プロファイルは時間とともに育ちます。
- 臨床的ではなく、会話的に。`;

export function registerOnboardingPrompt(server: McpServer): void {
  server.prompt(
    'onboarding',
    'Guide the user through creating their first personality profile',
    {
      language: z.string().optional().describe('"en" or "ja"'),
    },
    (args) => {
      const lang = args.language === 'ja' ? 'ja' : 'en';
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: lang === 'ja' ? ONBOARDING_JA : ONBOARDING_EN,
            },
          },
        ],
      };
    },
  );
}
