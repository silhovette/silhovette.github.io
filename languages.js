(() => {
  const switcher = document.querySelector("[data-language-switcher]");
  if (!switcher) return;

  // Only these explicitly marked homepage passages are translated.
  const translations = {
    affiliation: ["上海交通大学人工智能学院", "上海交通大學人工智能學院"],
    summary: ["人工智能专业本科生，主要研究 LLM agents、multi-agent systems 和 model collaboration。", "人工智能專業本科生，主要研究 LLM agents、multi-agent systems 和 model collaboration。"],
    academic: ["学术背景", "學術背景"],
    introduction: ["我是上海交通大学人工智能专业的本科生，研究方向为语言模型系统，主要关注 LLM agents、multi-agent systems 和 model collaboration。", "我是上海交通大學人工智能專業的本科生，研究方向為語言模型系統，主要關注 LLM agents、multi-agent systems 和 model collaboration。"],
    research: ["我的研究兴趣是构建能力强、适应性好的 agent 系统，使其能够在复杂环境中推理、协作并执行任务。近期研究涵盖自主 agent 系统、分层规划与恢复、跨设备交互、continual learning，以及大语言模型的高效适配。", "我的研究興趣是構建能力強、適應性好的 agent 系統，使其能夠在複雜環境中推理、協作並執行任務。近期研究涵蓋自主 agent 系統、分層規劃與恢復、跨裝置互動、continual learning，以及大語言模型的高效適配。"],
    honors: ["部分荣誉", "部分榮譽"],
    league: ["上海交通大学优秀共青团员", "上海交通大學優秀共青團員"],
    merit: ["上海交通大学三好学生，2024–2025 学年", "上海交通大學三好學生，2024–2025 學年"],
    scholarship: ["上海交通大学致远学院致远荣誉奖学金", "上海交通大學致遠學院致遠榮譽獎學金"],
    topics: ["研究方向", "研究方向"],
    agents: ["构建能够推理、执行任务、从失败中恢复，并通过交互和反馈持续改进的自主语言模型 agents。", "構建能夠推理、執行任務、從失敗中恢復，並透過互動和回饋持續改進的自主語言模型 agents。"],
    planning: ["研究如何在中间状态不断变化的情况下进行长程规划、执行过程中的恢复和自适应决策。", "研究如何在中間狀態不斷變化的情況下進行長程規劃、執行過程中的恢復和自適應決策。"],
    tools: ["将语言模型推理与外部工具、异构接口及真实环境中可验证的执行过程相结合。", "將語言模型推理與外部工具、異質介面及真實環境中可驗證的執行過程相結合。"],
    coordination: ["探索 agents、模型和异构设备之间的协作、任务委派与上下文共享。", "探索 agents、模型和異質裝置之間的協作、任務委派與上下文共享。"],
    adaptation: ["研究模型如何通过参数高效适配和模型合并，在保留已有知识的同时获得新能力。", "研究模型如何透過參數高效適配和模型合併，在保留已有知識的同時獲得新能力。"],
    reinforcement: ["研究 agents 如何在持续变化的非平稳环境中，通过交互学习、适应并保留有效行为。", "研究 agents 如何在持續變化的非平穩環境中，透過互動學習、適應並保留有效行為。"],
    featured: ["代表性工作与经历", "代表性工作與經歷"],
    manuscripts: ["预印本与论文稿件", "預印本與論文稿件"],
    stack: ["技术栈", "技術棧"],
    languages: ["使用 Python 和 C++ 进行研究原型开发、LLM 与 RL 实验、数据流水线搭建和系统工程开发。", "使用 Python 和 C++ 進行研究原型開發、LLM 與 RL 實驗、資料流水線搭建和系統工程開發。"],
    learning: ["使用 PyTorch、Transformers、PEFT 和 PPO 开展 LLM 微调、持续适配、模型合并、强化学习及受控消融研究。", "使用 PyTorch、Transformers、PEFT 和 PPO 開展 LLM 微調、持續適配、模型合併、強化學習及受控消融研究。"],
    systems: ["构建用于长程规划、分层恢复和多设备编排的 LLM agents，并通过 API、CLI 和 GUI 接口实现可靠执行。", "構建用於長程規劃、分層恢復和多裝置編排的 LLM agents，並透過 API、CLI 和 GUI 介面實現可靠執行。"],
    retrieval: ["使用 ChromaDB、FAISS、SentenceTransformers 和多语言 embedding 模型，实现基于证据的检索、知识库构建、文档处理流水线和来源可追溯的 RAG。", "使用 ChromaDB、FAISS、SentenceTransformers 和多語言 embedding 模型，實現基於證據的檢索、知識庫構建、文件處理流水線和來源可追溯的 RAG。"],
    engineering: ["基于 Linux、Git、CUDA 和 GPU 工作流，开展可复现实验、环境隔离、checkpoint 管理、并行执行和实验编排。", "基於 Linux、Git、CUDA 和 GPU 工作流，開展可重現實驗、環境隔離、checkpoint 管理、平行執行和實驗編排。"],
    evaluation: ["借助 Pandas、NumPy 和 scikit-learn 开展受控实验、消融实验、留出集评估、多随机种子分析、故障注入，以及基于后置条件的验证。", "藉助 Pandas、NumPy 和 scikit-learn 開展受控實驗、消融實驗、留出集評估、多隨機種子分析、故障注入，以及基於後置條件的驗證。"],
    beyond: ["研究之外", "研究之外"],
    photographs: ["用照片记录日常生活中吸引我目光的瞬间、地方和细节。", "用照片記錄日常生活中吸引我目光的瞬間、地方和細節。"],
    mods: ["为 Night Runners 制作自定义涂装、车辆解锁功能和全新对手车队。", "為 Night Runners 製作自訂塗裝、車輛解鎖功能和全新對手車隊。"],
    game: ["开发了可配置的浏览器音游原型，重点实现 Canvas 渲染、精准的输入时序判定、玩家状态管理和轻量级桌面打包。", "開發了可設定的瀏覽器音遊原型，重點實現 Canvas 渲染、精準的輸入時序判定、玩家狀態管理和輕量級桌面打包。"],
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
