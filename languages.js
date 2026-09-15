(() => {
  const switcher = document.querySelector("[data-language-switcher]");
  if (!switcher) return;

  // Only these explicitly marked homepage passages are translated.
  const translations = {
    affiliation: ["上海交通大学人工智能学院", "上海交通大學人工智能學院"],
    summary: ["上海交通大学人工智能专业本科生，主要研究 LLM Agent、多智能体系统与模型协作。", "上海交通大學人工智能專業本科生，主要研究 LLM Agent、多智能體系統與模型協作。"],
    academic: ["学术背景", "學術背景"],
    introduction: ["我是上海交通大学人工智能专业本科生，主要研究大语言模型 Agent、多智能体系统与模型协作。", "我是上海交通大學人工智能專業本科生，主要研究大語言模型 Agent、多智能體系統與模型協作。"],
    research: ["我关注如何构建能够在复杂环境中推理、协作、执行任务并持续适应变化的 Agent 系统。近期研究包括自主 Agent、分层规划与恢复、跨设备交互、持续学习，以及大语言模型的高效适配。", "我關注如何構建能夠在複雜環境中推理、協作、執行任務並持續適應變化的 Agent 系統。近期研究包括自主 Agent、分層規劃與恢復、跨裝置互動、持續學習，以及大語言模型的高效適配。"],
    honors: ["部分荣誉", "部分榮譽"],
    league: ["上海交通大学优秀共青团员", "上海交通大學優秀共青團員"],
    merit: ["上海交通大学三好学生，2024–2025 学年", "上海交通大學三好學生，2024–2025 學年"],
    scholarship: ["上海交通大学致远学院致远荣誉奖学金", "上海交通大學致遠學院致遠榮譽獎學金"],
    topics: ["研究方向", "研究方向"],
    agents: ["研究能够自主推理和执行任务、从失败中恢复，并通过交互与反馈持续改进的大语言模型 Agent。", "研究能夠自主推理和執行任務、從失敗中恢復，並透過互動與回饋持續改進的大語言模型 Agent。"],
    planning: ["研究 Agent 在状态持续变化的长程任务中如何进行规划、从执行失败中恢复，并根据环境变化调整决策。", "研究 Agent 在狀態持續變化的長程任務中如何進行規劃、從執行失敗中恢復，並根據環境變化調整決策。"],
    tools: ["研究语言模型如何结合外部工具与异构接口，在真实环境中完成可靠且可验证的任务执行。", "研究語言模型如何結合外部工具與異質介面，在真實環境中完成可靠且可驗證的任務執行。"],
    coordination: ["研究多个 Agent、模型与异构设备之间的协作、任务分配与上下文共享。", "研究多個 Agent、模型與異質裝置之間的協作、任務分配與上下文共享。"],
    adaptation: ["研究如何通过参数高效适配与模型合并，使模型在学习新能力的同时尽可能保留已有知识。", "研究如何透過參數高效適配與模型合併，使模型在學習新能力的同時盡可能保留已有知識。"],
    reinforcement: ["研究 Agent 如何在非平稳环境中通过持续交互进行学习与适应，并保留已经学会的有效行为。", "研究 Agent 如何在非平穩環境中透過持續互動進行學習與適應，並保留已經學會的有效行為。"],
    featured: ["代表性工作与经历", "代表性工作與經歷"],
    manuscripts: ["预印本与论文稿件", "預印本與論文稿件"],
    stack: ["技术栈", "技術棧"],
    languages: ["主要使用 Python 和 C++ 开发研究原型、开展 LLM 与 RL 实验，并完成数据处理与系统实现。", "主要使用 Python 和 C++ 開發研究原型、進行 LLM 與 RL 實驗，並完成資料處理與系統實現。"],
    learning: ["使用 PyTorch、Transformers、PEFT 和 PPO 进行 LLM 微调、持续适配、模型合并、强化学习与消融实验。", "使用 PyTorch、Transformers、PEFT 和 PPO 進行 LLM 微調、持續適配、模型合併、強化學習與消融實驗。"],
    systems: ["构建面向长程规划、分层恢复与多设备编排的 LLM Agent 系统，并通过 API、CLI 和 GUI 接口完成可靠执行。", "構建面向長程規劃、分層恢復與多裝置編排的 LLM Agent 系統，並透過 API、CLI 和 GUI 介面完成可靠執行。"],
    retrieval: ["使用 ChromaDB、FAISS、SentenceTransformers 与多语言 embedding 模型构建检索和 RAG 系统，包括知识库构建、文档处理与来源可追溯的证据检索。", "使用 ChromaDB、FAISS、SentenceTransformers 與多語言 embedding 模型構建檢索和 RAG 系統，包括知識庫構建、文件處理與來源可追溯的證據檢索。"],
    engineering: ["使用 Linux、Git、CUDA 和 GPU 工作流管理可复现实验，包括环境隔离、checkpoint 管理、并行执行与实验编排。", "使用 Linux、Git、CUDA 和 GPU 工作流程管理可重現實驗，包括環境隔離、checkpoint 管理、平行執行與實驗編排。"],
    evaluation: ["使用 Pandas、NumPy 和 scikit-learn 进行实验分析与评估，包括消融实验、留出集评估、多随机种子分析、故障注入和基于后置条件的验证。", "使用 Pandas、NumPy 和 scikit-learn 進行實驗分析與評估，包括消融實驗、留出集評估、多隨機種子分析、故障注入和基於後置條件的驗證。"],
    beyond: ["研究之外", "研究之外"],
    photographs: ["用照片记录日常生活中吸引我目光的瞬间、地方和细节。", "用照片記錄日常生活中吸引我目光的瞬間、地方和細節。"],
    mods: ["为 Night Runners 制作自定义涂装、车辆解锁功能和新的对手车队。", "為 Night Runners 製作自訂塗裝、車輛解鎖功能和新的對手車隊。"],
    game: ["开发了一款可配置的浏览器音游原型，实现了 Canvas 渲染、精确的输入时序判定、玩家状态管理和轻量级桌面打包。", "開發了一款可設定的瀏覽器音遊原型，實現了 Canvas 渲染、精確的輸入時序判定、玩家狀態管理和輕量級桌面封裝。"],
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
