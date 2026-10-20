// Complete event markup shared by the standalone timeline and homepage preview.
// A classic local script also works when the site is opened directly with file://.
(() => {
  "use strict";
  window.siteTimelineMarkup = `
<li>
          <span class="timeline-date">2012–2017</span>
          <div class="timeline-event">
            <h3 data-i18n="timeline_bilingual_school">Shanghai International Studies University Bilingual School</h3>
            <p data-i18n="timeline_primary">Primary School</p>
          </div>
        </li>
        <li>
          <span class="timeline-date">2017–2021</span>
          <div class="timeline-event">
            <h3 data-i18n="timeline_bilingual_school">Shanghai International Studies University Bilingual School</h3>
            <p data-i18n="timeline_middle">Middle School</p>
          </div>
        </li>
        <li>
          <span class="timeline-date">2021–2024</span>
          <div class="timeline-event">
            <h3 data-i18n="timeline_high_school">High School Affiliated to Shanghai Jiao Tong University</h3>
            <p data-i18n="timeline_high_school_level">High School</p>
          </div>
        </li>
        <li>
          <time class="timeline-date" datetime="2024-06">Jun 2024</time>
          <div class="timeline-event">
            <h3 data-i18n="timeline_gaokao">Gaokao (National College Entrance Examination)</h3>
            <p class="timeline-result"><span data-i18n="timeline_rank_prefix">617 / 660 · Shanghai Rank #</span><span class="timeline-rank"><span>6</span><span>7</span></span><span data-i18n="timeline_rank_suffix"></span></p>
          </div>
        </li>
        <li>
          <time class="timeline-date" datetime="2024-09">Sep 2024</time>
          <div class="timeline-event">
            <h3 data-i18n="timeline_sjtu_ai">School of Artificial Intelligence, Shanghai Jiao Tong University</h3>
            <p data-i18n="timeline_college">Undergraduate Studies</p>
          </div>
        </li>
        <li>
          <time class="timeline-date" datetime="2024-09">Sep 2024</time>
          <div class="timeline-event">
            <h3 data-i18n="timeline_monitor">Class Monitor of the First Undergraduate Cohort</h3>
            <p data-i18n="timeline_sjtu_ai">School of Artificial Intelligence, Shanghai Jiao Tong University</p>
          </div>
        </li>
        <li>
          <time class="timeline-date" datetime="2025-03">Mar 2025</time>
          <div class="timeline-event">
            <h3 data-i18n="timeline_talk">Hosted my first talk on science and technology innovation</h3>
            <p data-i18n="timeline_sjtu">Shanghai Jiao Tong University</p>
          </div>
        </li>
        <li>
          <time class="timeline-date" datetime="2025-10">Oct 2025</time>
          <div class="timeline-event">
            <h3 data-i18n="timeline_merit">Merit Student</h3>
            <p data-i18n="timeline_sjtu">Shanghai Jiao Tong University</p>
          </div>
        </li>
        <li>
          <time class="timeline-date" datetime="2026-01">Jan 2026</time>
          <div class="timeline-event">
            <h3 data-i18n="timeline_league">Outstanding League Member</h3>
            <p data-i18n="timeline_sjtu">Shanghai Jiao Tong University</p>
          </div>
        </li>
        <li>
          <time class="timeline-date" datetime="2026-06">Jun 2026</time>
          <div class="timeline-event">
            <h3>CET-6 · <strong>662</strong></h3>
          </div>
        </li>
        <li>
          <time class="timeline-date" datetime="2026-07">Jul 2026</time>
          <div class="timeline-event">
            <h3 data-i18n="timeline_summer_school">2026 Summer School on Reinforcement Learning</h3>
            <p data-i18n="timeline_innovation_institute">Shanghai Innovation Institute</p>
          </div>
        </li>
        <li>
          <time class="timeline-date" datetime="2026-10">Oct 2026</time>
          <div class="timeline-event">
            <h3 data-i18n="timeline_merit">Merit Student</h3>
            <p data-i18n="timeline_sjtu">Shanghai Jiao Tong University</p>
          </div>
        </li>
        <li class="timeline-present">
          <span class="timeline-date" data-i18n="timeline_present">Present</span>
          <div class="timeline-event">
            <h3 data-i18n="timeline_exploration">Endless exploration, endless growth.</h3>
          </div>
        </li>
  `;
  const timeline = document.querySelector(".personal-timeline");
  if (timeline) timeline.innerHTML = window.siteTimelineMarkup;
})();
