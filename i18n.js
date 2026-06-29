/* grpoVidBench — lightweight i18n (English / Simplified Chinese).
 * No dependencies. Language is persisted per-browser and a toggle button
 * (EN / 中文) is mounted in the top bar. UI strings and reviewer-facing
 * instructions are translated via the MAP below; the model's outputs under
 * review (question / answer / reasoning / summary) are left in their original
 * language unless a "<field>_zh" is supplied in the study JSON.
 *
 * NOTE: the Chinese strings are a best-effort professional translation — please
 * have a clinical collaborator sanity-check the surgical terminology.
 */
(function () {
  "use strict";
  var KEY = "grpovidbench:lang";
  var lang = "en";
  try { lang = localStorage.getItem(KEY) || "en"; } catch (e) {}

  // English -> Simplified Chinese. Anything not present falls back to English.
  var MAP = {
    // ---- top bar / picker ----
    "clinician review": "临床医生评审",
    "CholecT50 · surgical video reasoning": "CholecT50 · 外科手术视频推理",
    "Reviewer studies": "评审研究",
    "Review tasks": "评审任务",
    "Choose a study to review": "选择要评审的研究",
    "Choose a task to review": "选择要评审的任务",
    "Each study is self-contained: read the short intro, then rate items one at a time. Your progress is saved in this browser automatically, and you export your responses at the end.":
      "每个研究都是独立的：先阅读简短说明，然后逐条评价。您的进度会自动保存在本浏览器中，最后导出您的评审结果。",
    "Pick a task to review its clips one at a time. Your progress is saved in this browser automatically, and you export your responses at the end.":
      "选择一个任务以逐条评审其片段。您的进度会自动保存在本浏览器中，最后导出您的评审结果。",
    "Loading studies…": "正在加载研究…",
    "Loading tasks…": "正在加载任务…",
    "{n} clips": "{n} 个片段",
    "1 clip": "1 个片段",

    // ---- study type eyebrow ----
    "Study · criteria validation": "研究 · 标准验证",
    "Study · reasoning validation": "研究 · 推理验证",
    "Study · summary validation": "研究 · 总结验证",
    "Study": "研究",

    // ---- intro / reviewer gate ----
    "Begin review": "开始评审",
    "Your initials or email (for de-duplication)": "您的姓名缩写或邮箱（用于去重）",
    "e.g. SG or you@hospital.org": "例如 SG 或 you@hospital.org",
    "Please enter your initials or email to begin.": "请先输入您的姓名缩写或邮箱以开始。",
    "Reference": "参考信息",
    "What you need to do": "您需要做的事",
    "Welcome back": "欢迎回来",
    "Your progress was saved. Pick up where you left off — the items you've already done are marked below.": "您的进度已保存。从上次中断处继续——您已完成的条目在下方已标注。",
    "{a} answered · {s} skipped · {r} remaining (of {t})": "已回答 {a} · 已跳过 {s} · 剩余 {r}（共 {t}）",
    "Done": "已完成",
    "Not started": "未开始",
    "Continue where you left off": "从上次中断处继续",
    "Start over (clear my saved answers)": "重新开始（清除我已保存的答案）",
    "Start over? This permanently clears your saved answers for this task.": "确定重新开始吗？这将永久清除您在该任务中已保存的答案。",

    // ---- item sections ----
    "Question shown to the model": "提供给模型的问题",
    "Model's answer": "模型的回答",
    "Model's summary": "模型的总结",
    "Model's reasoning (<think>)": "模型的推理（<think>）",
    "Model's reasoning (<think>) — editable": "模型的推理（<think>）— 可编辑",
    "Model's answer — editable": "模型的回答 — 可编辑",
    "Reset to original": "恢复原文",
    "You can correct this reasoning; your edits are saved with your response.": "您可以修改此推理；您的编辑将随评审结果一并保存。",
    "You can correct this answer; your edits are saved with your response.": "您可以修改此回答；您的编辑将随评审结果一并保存。",

    // ---- prompt DO / DON'T rules ----
    "Prompt rules the reasoning had to follow": "推理需遵循的提示词规则",
    "Prompt rules the reasoning had to follow — editable": "推理需遵循的提示词规则 — 可编辑",
    "You can edit these rules; your edits are saved with your response.": "您可以编辑这些规则；您的编辑将随评审结果一并保存。",
    "DO": "应当（DO）",
    "DON'T": "不应当（DON'T）",
    "Rules": "规则",
    "Keep exactly three levels (L1 -> L2 -> L3), in order; ground every statement in observed evidence (instruments, actions, tissue/structures, timing).": "严格保持三个层级（L1 -> L2 -> L3）且顺序正确；每条陈述都以观察到的证据为依据（器械、操作、组织/结构、时间）。",
    "Use precise vocabulary: instruments (grasper, hook, scissors, clipper, bipolar, irrigator), the seven phases, the Calot (hepatocystic) triangle, anatomy (cystic duct, cystic artery, gallbladder, liver bed/fossa).": "使用精确术语：器械（抓钳、电钩、剪刀、施夹器、双极电凝、冲洗吸引器）、七个手术阶段、肝胆三角（Calot 三角）、解剖结构（胆囊管、胆囊动脉、胆囊、肝床）。",
    "Write as if you are watching the video; make L3 conclude the answer; be concise.": "如同正在观看视频般书写；让 L3 得出最终答案；保持简洁。",
    "Justify the span from the onset/offset activity; do NOT merely restate the time.": "依据起始/结束的操作来论证时间区间；不要只是复述时间。",
    "Timestamps ARE allowed (the span is the answer).": "允许使用时间戳（时间区间即为答案）。",
    "Do not reveal the facts were provided: never write \"given\", \"as provided\", \"the label\", \"the answer\", \"ground truth\", and do not refer to \"the captions/observations/text\".": "不要透露这些事实是被提供的：切勿写“given”“as provided”“the label”“the answer”“ground truth”，也不要提及“字幕/观察/文本”。",
    "Do not invent anything not observed (no patient history, no off-screen events, no measurements).": "不要臆造任何未观察到的内容（无病史、无画面外事件、无测量数据）。",
    "Do not skip, merge, reorder, or add a level.": "不要跳过、合并、重排或新增层级。",
    "Do not hedge or list alternatives (\"possibly X or Y\") — commit to the reasoning that reaches the answer.": "不要含糊其辞或列举备选（“可能是 X 或 Y”）——坚定地给出能得出答案的推理。",
    "Do not invent a span for an absent phase — conclude it does not occur.": "不要为未出现的阶段臆造时间区间——应判定其未发生。",
    "Read the END of the clip to set the current phase.": "依据片段结尾来确定当前阶段。",
    "Do not base the current phase on early-clip activity.": "不要根据片段早期的操作来判断当前阶段。",
    "Keep L3 at HEADLINE level (one short phrase per segment).": "L3 保持在标题层级（每段一句简短短语）。",
    "Justify non-overlap/contiguity at L2.": "在 L2 论证各段不重叠且连续。",
    "Timestamps ARE allowed.": "允许使用时间戳。",
    "Do NOT write the full captions inside the think — that duplicates the answer; headline only.": "不要在推理（think）中写出完整描述——那会与答案重复；仅写标题。",
    "Do not include phases that are absent (it is a filter).": "不要包含未出现的阶段（这是一个筛选过程）。",
    "Select and compress (arc + salience).": "进行选择与压缩（整体过程 + 显著性）。",
    "Lowercase instrument names; observable steps only.": "器械名称用小写；仅限可观察的步骤。",
    "Do NOT enumerate per segment or include timestamps (that is DVC, not VS).": "不要逐段列举或包含时间戳（那是 DVC，而非 VS）。",
    "Do not use 'indicates' / 'suggesting that' phrasing.": "不要使用“indicates（表明）”/“suggesting that（暗示）”之类的措辞。",
    "Do not restate the whole summary inside L1/L2.": "不要在 L1/L2 中复述整段总结。",
    "Do NOT reveal that any trajectory, narrative, label, or ground truth was provided. Never write \"given\" or \"as provided\".": "不要透露任何轨迹、叙述、标签或真实标注是被提供的。切勿写“given”或“as provided”。",
    "Do NOT confuse the criteria or renumber them; the timeline MUST match the reference trajectory.": "不要混淆各标准或重新编号；时间线必须与参考轨迹一致。",
    "Model's reasoning": "模型的推理",
    "No reasoning trace for this item — rate the answer only.": "该条目没有推理过程——仅评价回答。",
    "Criterion under review": "待评审的标准",
    "Intended rationale": "设定该标准的理由",
    "No video associated with this item.": "该条目没有关联视频。",

    // ---- context guide ----
    "Context — how to rate this reasoning": "背景说明——如何评价该推理",
    "Context — how to rate this reasoning — editable": "背景说明——如何评价该推理 — 可编辑",
    "You can edit these reasoning levels; your edits are saved with your response.": "您可以编辑这些推理层级；您的编辑将随评审结果一并保存。",

    // ---- dimensions / inputs ----
    "(optional)": "（可选）",
    "— select —": "— 请选择 —",
    "Add a comment (optional)": "添加备注（可选）",
    "Type here…": "在此输入…",

    // ---- skip ----
    "Skipped": "已跳过",
    "You marked this item as skipped — answers below are optional. Answer any question to include it again.":
      "您已将该条目标记为跳过——以下回答为可选。回答任意问题即可重新纳入。",

    // ---- footer nav ----
    "← Previous": "← 上一条",
    "Next →": "下一条 →",
    "Review & submit →": "检查并提交 →",
    "Skip this item": "跳过该条目",

    // ---- player ----
    "buffering…": "缓冲中…",
    "No frames in manifest.": "清单中没有帧。",
    "Highlighted window": "高亮区间",
    "Highlighted windows": "高亮区间",

    // ---- wrap-up ----
    "Almost done": "即将完成",
    "Review & submit": "检查并提交",
    "All items have their required answers. Add any final notes below, then submit.":
      "所有条目的必填项均已完成。可在下方填写最后备注，然后提交。",
    "Final notes": "最后备注",
    "Submit responses": "提交评审结果",
    "← Back to items": "← 返回条目",

    // ---- done ----
    "Thank you — review complete": "谢谢——评审已完成",
    "Your responses were submitted automatically. A JSON and CSV copy was also downloaded to your computer as a backup — no need to email anything unless asked.":
      "您的评审结果已自动提交。同时已将 JSON 和 CSV 副本下载到您的电脑作为备份——除非另有要求，无需发送邮件。",
    "Your responses have been downloaded as a JSON and a CSV file. Please send us the file (whichever your coordinator requested).":
      "您的评审结果已下载为 JSON 和 CSV 文件。请将文件发送给我们（按协调人要求的格式）。",
    "Your responses were submitted to the study automatically. The downloaded files are just a backup.":
      "您的评审结果已自动提交到研究。下载的文件仅作备份之用。",
    "(Automatic submission could not be sent — please email the downloaded files.)":
      "（自动提交未能发送——请将下载的文件通过邮件发送给我们。）",
    "Download JSON again": "再次下载 JSON",
    "Download CSV again": "再次下载 CSV",
    "← Back to all studies": "← 返回全部研究",
    "← Back to studies": "← 返回研究列表",
    "Saved": "已保存",

    // ---- task labels ----
    "Temporal Action Localization (TAL)": "时间动作定位（TAL）",
    "Next Action Prediction (NAP)": "下一步动作预测（NAP）",
    "Dense Video Captioning (DVC)": "密集视频描述（DVC）",
    "Video Summarization (VS)": "视频总结（VS）",
    "Critical View of Safety (CVS)": "安全关键视图（CVS）",

    // ---- study titles ----
    "CholecT50 reasoning - clinician review": "CholecT50 推理 — 临床医生评审",
    "CholecT50 reasoning criteria — clinician review": "CholecT50 推理标准 — 临床医生评审",
    "CholecT50 video summaries - clinician review": "CholecT50 视频总结 — 临床医生评审",
    "Endoscapes CVS - clinician review": "Endoscapes CVS — 临床医生评审",
    "1 · Validate the reasoning criteria": "1 · 验证推理标准",
    "1 · Validate per-video reasoning": "1 · 验证逐视频推理",
    "2 · Validate per-video reasoning": "2 · 验证逐视频推理",
    "2 · Validate Endoscapes CVS reasoning": "2 · 验证 Endoscapes CVS 推理",
    "3 · Validate video summaries": "3 · 验证视频总结",
    "3 · Validate Endoscapes CVS reasoning": "3 · 验证 Endoscapes CVS 推理",
    "4 · Validate Endoscapes CVS reasoning": "4 · 验证 Endoscapes CVS 推理",

    // ---- dimension labels (think) ----
    "Reasoning <think> is faithful to the video (no invented detail)": "推理 <think> 忠实于视频内容（无虚构细节）",
    "Clinical / phase-order logic is valid": "临床/手术阶段顺序逻辑是否成立",
    "L1 is correct (see the pinned levels for this task)": "L1 正确（参见该任务固定显示的层级说明）",
    "L2 is correct": "L2 正确",
    "L3 is correct, and the final conclusion follows from it": "L3 正确，且最终结论由其得出",
    "Overall": "总体评价",
    "Main error (if any)": "主要错误（如有）",
    "Comments": "备注",

    // ---- dimension labels (caption) ----
    "Summary is factually correct for this video": "总结对该视频在事实上正确",
    "Summary covers the main surgical activities (nothing important omitted)": "总结涵盖主要手术操作（无重要遗漏）",
    "Surgical terminology is used correctly": "手术术语使用正确",
    "Hallucinated / invented detail": "幻觉/虚构细节",

    // ---- dimension labels (criteria) ----
    "This criterion is appropriate to require of the reasoning": "该标准适合作为对推理的要求",
    "This criterion is clearly and unambiguously stated": "该标准表述清晰、无歧义",
    "Keep this criterion?": "是否保留该标准？",
    "Comments (edits, ambiguities, anything missing)": "备注（修改建议、歧义、遗漏等）",

    // ---- dimension labels (cvs) ----
    "Reasoning <think> is faithful to the frames (no invented detail)": "推理 <think> 忠实于画面（无虚构细节）",
    "The per-criterion timeline (when C1/C2/C3 are first met, or never) is correct":
      "各标准的时间线（C1/C2/C3 首次满足的时间，或始终未满足）正确",
    "The final CVS verdict is correct": "最终 CVS 判定正确",

    // ---- scale captions ----
    "Incorrect": "错误",
    "Partially correct": "部分正确",
    "Fully correct": "完全正确",
    "Strongly disagree": "强烈不同意",
    "Neutral": "中立",
    "Strongly agree": "强烈同意",

    // ---- select options ----
    "Accept": "接受",
    "Minor edits": "小幅修改",
    "Reject": "拒绝",
    "None": "无",
    "Wrong phase": "阶段错误",
    "Wrong time-boundary": "时间边界错误",
    "Hallucinated detail": "幻觉细节",
    "Terminology": "术语问题",
    "Other": "其他",
    "Minor": "轻微",
    "Major": "严重",
    "Wrong criterion timing": "标准时间判断错误",
    "Wrong final verdict": "最终判定错误",
    "Criteria confused": "标准混淆",
    "Keep as-is": "原样保留",
    "Keep with edits": "修改后保留",
    "Drop": "删除",

    // ---- wrap-up labels ----
    "Anything important the criteria/items missed?": "标准/条目是否遗漏了重要内容？",
    "Anything important the summaries consistently miss?": "这些总结是否一贯遗漏了重要内容？",
    "Anything important these items or criteria missed?": "这些条目或标准是否遗漏了重要内容？",
    "Is there any reasoning requirement these criteria miss entirely?": "这些标准是否完全遗漏了某项推理要求？",
    "Overall, do these three criteria capture what good surgical-video reasoning should show?":
      "总体而言，这三条标准是否涵盖了优秀外科视频推理应体现的内容？",

    // ---- level guides: questions ----
    "when does a given phase happen?": "某个手术阶段在何时发生？",
    "what phase comes next?": "下一个手术阶段是什么？",
    "list and describe the segments.": "列出并描述各时间段。",
    "summarize the whole clip.": "总结整个片段。",
    "how does the Critical View of Safety develop across the clip, and what is its final status?":
      "安全关键视图（CVS）在整个片段中如何变化，最终状态如何？",

    // ---- level guides: short labels ----
    "phase signature & onset cue": "阶段标志与起始线索",
    "boundary contrast": "边界对比",
    "phase-order bound & conclusion": "阶段顺序约束与结论",
    "current step at the clip's end": "片段结尾处的当前步骤",
    "completion cue": "完成线索",
    "procedural logic & conclusion": "流程逻辑与结论",
    "scan & enumerate": "扫描与枚举",
    "boundaries": "边界",
    "per-segment content & conclusion": "各段内容与结论",
    "survey the arc": "梳理整体过程",
    "salience & transitions": "显著性与转换",
    "compress & conclusion": "压缩与结论",
    "trajectory survey": "轨迹梳理",
    "per-criterion progression": "各标准的演进",
    "CVS synthesis": "CVS 综合判断",

    // ---- level guides: descriptions (think) ----
    "Names the queried phase and its visual hallmark - the specific instruments, actions and anatomy that define it - and pinpoints the moment it first becomes visible (its onset), grounded in what is on screen rather than a guess.":
      "指出所查询的手术阶段及其视觉标志——定义该阶段的具体器械、操作与解剖结构——并确定它首次可见的时刻（起始点），依据画面所见而非猜测。",
    "Distinguishes the phase from the activity immediately before and after it, using the change in instruments/actions to fix where the phase ends (its offset) - so both edges of the window are justified by observation, not just the middle.":
      "通过器械/操作的变化，将该阶段与其紧邻的前后操作区分开，从而确定该阶段的结束点（终止点）——使时间区间的两端都有观察依据，而不仅仅是中间。",
    "Places the phase within the fixed cholecystectomy phase order to confirm the window is consistent with the workflow, then states the final time span as the conclusion.":
      "将该阶段置于固定的胆囊切除术阶段顺序中，确认其时间区间与流程一致，然后给出最终的时间跨度作为结论。",
    "From the activity in the FINAL part of the clip (not the early-clip activity), identifies the phase currently in progress by its instruments, action and structures.":
      "根据片段最后部分的操作（而非片段开头的操作），通过器械、动作与结构判断当前正在进行的阶段。",
    "Gives the observed evidence that the current phase's objective is essentially achieved (target divided / freed / packed / fossa cleared), so that a transition to the next phase is due.":
      "给出当前阶段目标基本完成的观察证据（目标已切断/游离/装袋/创面已清理），表明应当过渡到下一阶段。",
    "Applies the fixed phase order - the step following the current one is the next action - to name the predicted next phase, or justifies a non-textbook successor from the observed state (e.g. residual bleeding -> coagulation revisited).":
      "依据固定的阶段顺序——当前阶段之后即为下一步——给出预测的下一阶段；若并非教科书式的后续阶段，则依据观察到的状态加以说明（例如残余出血 → 再次电凝）。",
    "Sweeping the clip from start to end, lists which candidate phases appear and in what order, by their visual signatures; phases that never appear are omitted.":
      "从头到尾浏览片段，依据视觉标志列出出现了哪些候选阶段及其顺序；未出现的阶段则省略。",
    "For each adjacent pair of segments, states the transition cue (the change in instrument/action) that fixes the boundary, so the segments are contiguous and non-overlapping.":
      "对每一对相邻片段，说明确定边界的转换线索（器械/操作的变化），使各段连续且不重叠。",
    "For each segment in order, gives the key instrument-action-structure its caption must carry, then concludes with the list of [start, end] segments and their headline captions.":
      "按顺序为每一段给出其描述应包含的关键器械-操作-结构，然后以 [起始, 结束] 时间段及其概要描述的列表作为结论。",
    "Surveys the clip from start to end, naming the phases/activities it moves through and the overall direction of the procedure.":
      "从头到尾梳理片段，指出其经历的阶段/操作及手术的总体走向。",
    "Separates the salient through-line (the defining actions) from minor or repeated maneuvers that can be compressed, and marks where the main transitions occur.":
      "将显著的主线（决定性操作）与可压缩的次要或重复操作区分开，并标出主要转换发生的位置。",
    "Compresses the arc into the high-level summary the final answer states - the condensed account of what the surgeon accomplishes across the clip.":
      "将整体过程压缩为最终回答所陈述的高层次总结——即整段中外科医生所完成工作的精炼概括。",

    // ---- level guides: descriptions (cvs) ----
    "States the CVS state at the START of the clip, the state at the END, and the overall direction of the dissection (progressing toward CVS, stalling, or regressing).":
      "说明片段开始时的 CVS 状态、结束时的状态，以及分离过程的总体走向（趋向 CVS、停滞或倒退）。",
    "Tracks C1, then C2, then C3 SEPARATELY - saying when each is first met (or never) - with each tied only to its own evidence region: C1 = two structures (cystic duct + cystic artery) at the gallbladder neck; C2 = the hepatocystic (Calot) triangle window cleared of fat/fibrous tissue; C3 = the lower third of the gallbladder dissected off the cystic plate (liver-bed interface). One criterion's change must not be used to explain another's.":
      "分别跟踪 C1、C2、C3——说明各标准何时首次满足（或始终未满足）——且每项仅依据其自身的证据区域：C1 = 胆囊颈部的两条结构（胆囊管 + 胆囊动脉）；C2 = 肝胆三角（Calot 三角）窗口已清除脂肪/纤维组织；C3 = 胆囊下三分之一已从胆囊板（肝床界面）分离。不得用某一标准的变化来解释另一标准。",
    "Determines when (if ever) all three criteria are met simultaneously and the status on the final frame; if CVS is never achieved, names the limiting criteria.":
      "判断三项标准是否（以及何时）同时满足，以及最后一帧的状态；若始终未达成 CVS，则指出受限的标准。",

    // ---- templates (with {placeholders}) ----
    "Item {n} of {total}": "第 {n} 项 / 共 {total} 项",
    "{a} / {b} done": "{a} / {b} 已完成",
    "Frame failed to load ({name})": "帧加载失败（{name}）",
    "Could not load video: {msg}": "无法加载视频：{msg}",
    "Manifest expected at {url}": "清单文件应位于 {url}",
    "{n} keyframes · timeline normalized 0.00–1.00": "{n} 个关键帧 · 时间轴归一化为 0.00–1.00",
    "{n} frames": "{n} 帧",
    "Source: {fps} fps · {n} frames": "来源：{fps} fps · 共 {n} 帧",
    "clip length {mmss} ({sec} s)": "片段时长 {mmss}（{sec} 秒）",
    "{n} item(s) still need a required answer:": "还有 {n} 个条目的必填项未完成：",
    "Item {n} ({task})": "第 {n} 项（{task}）",
    "Item {n}": "第 {n} 项",
    "{n} item(s) were skipped (recorded as skipped). You can go back to answer any of them.":
      "已跳过 {n} 个条目（已记录为跳过）。您可以返回回答其中任意一个。",
    "Files: {json} · {csv}": "文件：{json} · {csv}",
    "Read the model's reasoning <think> above. For this {task} item — {q} — a good trace must carry the three levels below. Check each level is present and correct, then answer the rating questions.":
      "请阅读上方模型的推理 <think>。对于本条 {task} 任务——{q}——优秀的推理应包含下方三个层级。请检查每个层级是否齐全且正确，然后回答评分问题。",
    "Read the model's reasoning <think> above. For this {task} item, a good trace must carry the three levels below. Check each level is present and correct, then answer the rating questions.":
      "请阅读上方模型的推理 <think>。对于本条 {task} 任务，优秀的推理应包含下方三个层级。请检查每个层级是否齐全且正确，然后回答评分问题。"
  };

  var listeners = [];
  function tr(s) {
    if (s == null) return s;
    if (lang === "zh" && Object.prototype.hasOwnProperty.call(MAP, s)) return MAP[s];
    return s;
  }
  function tf(s, params) {
    return tr(s).replace(/\{(\w+)\}/g, function (m, k) { return params && params[k] != null ? params[k] : m; });
  }
  function L(obj, field) {
    if (!obj) return "";
    var en = obj[field];
    if (lang !== "zh") return en;
    var z = obj[field + "_zh"];
    if (z != null && z !== "") return z;
    return tr(en);
  }
  // task code -> human label (localized via the MAP above)
  var TASK_NAMES = {
    TAL: "Temporal Action Localization (TAL)",
    NAP: "Next Action Prediction (NAP)",
    DVC: "Dense Video Captioning (DVC)",
    VS: "Video Summarization (VS)",
    CVS: "Critical View of Safety (CVS)"
  };
  function taskName(code) { return tr(TASK_NAMES[code] || code); }
  function current() { return lang; }
  function setLang(l) {
    lang = (l === "zh") ? "zh" : "en";
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    try { document.documentElement.lang = (lang === "zh") ? "zh-Hans" : "en"; } catch (e) {}
    listeners.forEach(function (fn) { try { fn(lang); } catch (e) {} });
  }
  function onChange(fn) { listeners.push(fn); }
  function mountToggle(container) {
    if (!container) return null;
    var b = document.createElement("button");
    b.className = "lang-toggle";
    b.type = "button";
    function paint() {
      b.textContent = (lang === "zh") ? "EN" : "中文";
      b.setAttribute("aria-label", (lang === "zh") ? "Switch to English" : "切换为中文");
      b.title = b.getAttribute("aria-label");
    }
    paint();
    b.addEventListener("click", function () { setLang(lang === "zh" ? "en" : "zh"); paint(); });
    container.appendChild(b);
    return b;
  }
  try { document.documentElement.lang = (lang === "zh") ? "zh-Hans" : "en"; } catch (e) {}
  window.I18N = { tr: tr, tf: tf, L: L, taskName: taskName, current: current, setLang: setLang, onChange: onChange, mountToggle: mountToggle };
})();
