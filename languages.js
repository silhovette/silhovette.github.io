(() => {
  const switcher = document.querySelector("[data-language-switcher]");
  if (!switcher) return;

  // Only these explicitly marked homepage passages are translated.
  const translations = {
    affiliation: ["上海交通大学人工智能学院", "上海交通大學人工智能學院"],
    summary: ["人工智能专业本科生，主要研究 LLM Agent、多智能体系统与模型协作。", "人工智能專業本科生，主要研究 LLM Agent、多智能體系統與模型協作。"],
    academic: ["学术背景", "學術背景"],
    introduction: ["我是上海交通大学人工智能专业本科生，主要研究大语言模型 Agent、多智能体系统与模型协作。", "我是上海交通大學人工智能專業本科生，主要研究大語言模型 Agent、多智能體系統與模型協作。"],
    research: ["我关注 Agent 系统如何在复杂环境中推理、协作和执行任务，并持续适应变化。近期研究包括自主 Agent、分层规划与恢复、跨设备交互、持续学习，以及大语言模型的高效适配。", "我關注 Agent 系統如何在複雜環境中推理、協作和執行任務，並持續適應變化。近期研究包括自主 Agent、分層規劃與恢復、跨裝置互動、持續學習，以及大語言模型的高效適配。"],
    honors: ["部分荣誉", "部分榮譽"],
    league: ["上海交通大学优秀共青团员", "上海交通大學優秀共青團員"],
    merit: ["上海交通大学三好学生，2024–2025 学年", "上海交通大學三好學生，2024–2025 學年"],
    scholarship: ["上海交通大学致远学院致远荣誉奖学金", "上海交通大學致遠學院致遠榮譽獎學金"],
    topics: ["研究方向", "研究方向"],
    agents: ["研究大语言模型 Agent 的自主推理、任务执行与失败恢复，以及如何通过交互和反馈持续改进。", "研究大語言模型 Agent 的自主推理、任務執行與失敗恢復，以及如何透過互動和回饋持續改進。"],
    planning: ["研究 Agent 如何在长程任务中规划行动、从执行失败中恢复，并随任务状态变化调整决策。", "研究 Agent 如何在長程任務中規劃行動、從執行失敗中恢復，並隨任務狀態變化調整決策。"],
    tools: ["研究如何将语言模型的推理与外部工具、异构接口结合，让真实环境中的任务执行可靠、可验证。", "研究如何將語言模型的推理與外部工具、異質介面結合，讓真實環境中的任務執行可靠、可驗證。"],
    coordination: ["研究多个 Agent、模型与异构设备之间的协作、任务分配与上下文共享。", "研究多個 Agent、模型與異質裝置之間的協作、任務分配與上下文共享。"],
    adaptation: ["研究如何通过参数高效适配与模型合并，让模型掌握新能力，同时尽可能保留已有知识。", "研究如何透過參數高效適配與模型合併，讓模型掌握新能力，同時盡可能保留已有知識。"],
    reinforcement: ["研究 Agent 如何在非平稳环境中通过持续交互学习、适应，并保留已学会的有效行为。", "研究 Agent 如何在非平穩環境中透過持續互動學習、適應，並保留已學會的有效行為。"],
    featured: ["代表性工作与经历", "代表性工作與經歷"],
    manuscripts: ["预印本与论文稿件", "預印本與論文稿件"],
    stack: ["技术栈", "技術棧"],
    languages: ["主要使用 Python 和 C++ 开发研究原型、运行 LLM 与 RL 实验、搭建数据处理流程，并开发相关系统。", "主要使用 Python 和 C++ 開發研究原型、執行 LLM 與 RL 實驗、建立資料處理流程，並開發相關系統。"],
    learning: ["使用 PyTorch、Transformers、PEFT 和 PPO 进行 LLM 微调、持续适配、模型合并、强化学习与消融实验。", "使用 PyTorch、Transformers、PEFT 和 PPO 進行 LLM 微調、持續適配、模型合併、強化學習與消融實驗。"],
    systems: ["构建面向长程规划、分层恢复与多设备编排的 LLM Agent 系统，通过 API、CLI 和 GUI 接口可靠地执行任务。", "構建面向長程規劃、分層恢復與多裝置編排的 LLM Agent 系統，透過 API、CLI 和 GUI 介面可靠地執行任務。"],
    retrieval: ["使用 ChromaDB、FAISS、SentenceTransformers 与多语言 embedding 模型搭建知识库和文档处理流程，支持基于证据的检索与来源可追溯的 RAG。", "使用 ChromaDB、FAISS、SentenceTransformers 與多語言 embedding 模型建立知識庫和文件處理流程，支援基於證據的檢索與來源可追溯的 RAG。"],
    engineering: ["基于 Linux、Git 和 CUDA 组织 GPU 实验，通过环境隔离、checkpoint 管理、并行执行与实验编排，支持实验复现。", "基於 Linux、Git 和 CUDA 組織 GPU 實驗，透過環境隔離、checkpoint 管理、平行執行與實驗編排，支援實驗重現。"],
    evaluation: ["注重实验条件控制，结合消融实验、留出集评估、多随机种子分析、故障注入和基于后置条件的验证评估系统，并使用 Pandas、NumPy 和 scikit-learn 分析实验结果。", "注重實驗條件控制，結合消融實驗、留出集評估、多隨機種子分析、故障注入和基於後置條件的驗證評估系統，並使用 Pandas、NumPy 和 scikit-learn 分析實驗結果。"],
    beyond: ["研究之外", "研究之外"],
    photographs: ["用照片记录日常生活中吸引我目光的瞬间、地方和细节。", "用照片記錄日常生活中吸引我目光的瞬間、地方和細節。"],
    mods: ["为 Night Runners 制作 Mod，包括自定义涂装、车辆解锁功能和新的对手车队。", "為 Night Runners 製作 Mod，包括自訂塗裝、車輛解鎖功能和新的對手車隊。"],
    game: ["开发了一款可配置的浏览器音游原型，涵盖 Canvas 渲染、输入时序判定、玩家状态管理和轻量级桌面打包。", "開發了一款可設定的瀏覽器音遊原型，涵蓋 Canvas 渲染、輸入時序判定、玩家狀態管理和輕量級桌面封裝。"],
  };
  const passages = [...document.querySelectorAll("[data-i18n]")].map(element => ({
    element, english: element.textContent, key: element.dataset.i18n,
  }));
  const buttons = [...switcher.querySelectorAll("[data-language]")];
  const supported = ["en", "zh-Hans", "zh-Hant"];
  const applyLanguage = language => {
    if (!supported.includes(language)) language = "en";
    for (const { element, english, key } of passages) {
      element.textContent = language === "en" ? english : translations[key][language === "zh-Hans" ? 0 : 1];
    }
    document.documentElement.lang = language;
    buttons.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.language === language)));
    try { localStorage.setItem("site-language", language); } catch { /* Switching still works without storage. */ }
    document.dispatchEvent(new Event("site-language-change"));
  };
  buttons.forEach(button => button.addEventListener("click", () => applyLanguage(button.dataset.language)));
  let initialLanguage = "en";
  try { initialLanguage = localStorage.getItem("site-language") || "en"; } catch { /* Default to English. */ }
  applyLanguage(initialLanguage);
})();
