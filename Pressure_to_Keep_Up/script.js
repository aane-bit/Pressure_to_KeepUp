// ==========================================
// THE PRESSURE TO KEEP UP — Main JavaScript
// Each section only runs on the page that has its elements.
// ==========================================

// ---------- Helpers ----------

const $ = (id) => document.getElementById(id);
const $$ = (selector) => document.querySelectorAll(selector);

const ARROW_ICON =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

// Button text followed by the arrow icon
function setLabel(button, text) {
    button.innerHTML = `${text} ${ARROW_ICON}`;
}

// Mark exactly one item as active (null clears all)
function setActive(items, activeIndex) {
    items.forEach((item, i) => item.classList.toggle("active", i === activeIndex));
}

// Mark exactly one choice as selected (null clears all)
function setSelected(choices, selected) {
    choices.forEach((choice) => {
        const isSelected = choice === selected;
        choice.classList.toggle("selected", isSelected);
        choice.setAttribute("aria-pressed", isSelected);
    });
}

// Make a group of buttons behave like radio choices
function onChoose(choices, callback) {
    choices = Array.from(choices);

    choices.forEach((choice) => {
        choice.setAttribute("aria-pressed", "false");
        choice.addEventListener("click", () => {
            setSelected(choices, choice);
            callback(choice);
        });
    });
}

/*
 Shared step-by-step flow used by Check-In, Scenarios,
 Reflection and Takeaway.

 options:
   screens, prev, next, controls, complete, progress, counter
   counterText(n, total)  text for the counter
   doneText               counter text when finished
   finalLabel             text on the last "next" button
   dots                   optional progress dots
   gated                  true = Continue stays disabled until answered
   message                optional { el, idle, answered }
   onShow(n, total)       optional, runs on every step
   onFinish()             optional, runs before the completion screen
*/
function createStepper(options) {
    const o = options;
    const total = o.screens.length;
    const answered = new Array(total).fill(!o.gated);
    let current = 0;

    function show(index) {
        current = index;
        const n = index + 1;

        setActive(o.screens, index);
        o.counter.textContent = o.counterText(n, total);
        o.progress.style.width = `${(n / total) * 100}%`;
        o.prev.disabled = index === 0;
        o.next.disabled = !answered[index];
        setLabel(o.next, index === total - 1 ? o.finalLabel : "Continue");

        if (o.dots) setActive(o.dots, index);
        if (o.message) {
            o.message.el.textContent = answered[index] ? o.message.answered : o.message.idle;
        }
        if (o.onShow) o.onShow(n, total);
    }

    function finish() {
        if (o.onFinish) o.onFinish();

        setActive(o.screens, -1);
        o.complete.classList.add("active");
        o.controls.style.display = "none";
        o.counter.textContent = o.doneText;
        o.progress.style.width = "100%";

        if (o.dots) o.dots.forEach((dot) => dot.classList.add("active"));
    }

    o.next.addEventListener("click", () => {
        if (!answered[current]) return;

        if (current < total - 1) show(current + 1);
        else finish();
    });

    o.prev.addEventListener("click", () => {
        if (current > 0) show(current - 1);
    });

    show(0);

    return {
        // Call when the current screen has been answered
        markAnswered(message) {
            answered[current] = true;
            o.next.disabled = false;
            if (message && o.message) o.message.el.textContent = message;
        }
    };
}


// ==========================================
// 1. MOBILE NAVIGATION
// ==========================================

const menuButton = $("menuButton");
const mobileNav = $("mobileNav");

if (menuButton && mobileNav) {
    function setMenu(open) {
        mobileNav.classList.toggle("open", open);
        menuButton.setAttribute("aria-expanded", open);
    }

    menuButton.addEventListener("click", () => {
        setMenu(!mobileNav.classList.contains("open"));
    });

    mobileNav.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => setMenu(false));
    });
}


// ==========================================
// 2. CHECK-IN
// ==========================================

const questionScreens = $$(".question-screen[data-question]");

if (questionScreens.length > 0 && $("nextQuestion") && $("previousQuestion")) {
    const answers = [];

    // Only used to pick a relevant message, NOT a psychological score.
    const results = [
        {
            max: 1,
            title: "You seem able to keep some distance from comparison.",
            text: "Your answers suggest that other people's posts may not strongly shape how you see yourself most of the time. Even so, comparison can appear in subtle ways. The next activity will help you recognize what it can look like in everyday situations."
        },
        {
            max: 3,
            title: "Comparison may show up from time to time.",
            text: "Your answers suggest that social media comparison can sometimes influence how you think about your progress, appearance, or online reactions. Noticing when this happens can make it easier to separate your own values from the pressure to keep up."
        },
        {
            max: Infinity,
            title: "Social comparison may be worth noticing more closely.",
            text: "Your answers suggest that what you see or receive online may sometimes influence how you evaluate yourself. This is not a diagnosis or judgment. It is simply an invitation to notice when someone else's appearance, progress, or validation begins to become the measurement of your own."
        }
    ];

    const checkin = createStepper({
        screens: questionScreens,
        prev: $("previousQuestion"),
        next: $("nextQuestion"),
        controls: $("questionControls"),
        complete: $("checkinResult"),
        progress: $("checkinProgress"),
        counter: $("questionCounter"),
        counterText: (n, total) => `Question ${n} of ${total}`,
        doneText: "Check-In Complete",
        finalLabel: "See My Reflection",
        gated: true,
        message: {
            el: $("selectionMessage"),
            idle: "Choose the answer that feels closest to you.",
            answered: "Answer selected. Continue when you're ready."
        },
        onShow: (n, total) => {
            $("questionPercent").textContent = `${Math.round((n / total) * 100)}%`;
        },
        onFinish: () => {
            const total = answers.reduce((sum, value) => sum + value, 0);
            const result = results.find((r) => total <= r.max);

            $("resultTitle").textContent = result.title;
            $("resultDescription").textContent = result.text;
            $("questionPercent").textContent = "100%";
        }
    });

    questionScreens.forEach((screen, index) => {
        onChoose(screen.querySelectorAll(".answer-card"), (button) => {
            answers[index] = Number(button.dataset.value);
            checkin.markAnswered("Answer selected. Continue when you're ready.");
        });
    });
}


// ==========================================
// 3. SCENARIOS
// ==========================================

const scenarioScreens = $$(".scenario-screen[data-scenario]");

if (scenarioScreens.length > 0 && $("previousScenario") && $("nextScenario")) {
    const feedbackMessages = {
        comparison:
            "Notice what happened: the post became a measurement for your own life. Comparison can make another person's moment feel like evidence that you are behind, even though the two lives may have completely different circumstances.",
        mixed:
            "Two feelings can exist at the same time. You can genuinely appreciate someone else's experience while also noticing that it creates pressure in you. Recognizing that tension is part of self-awareness.",
        grounded:
            "This response keeps the post separate from your own worth. You can notice someone else's experience without automatically turning it into a standard that your life must meet."
    };

    const scenarios = createStepper({
        screens: scenarioScreens,
        prev: $("previousScenario"),
        next: $("nextScenario"),
        controls: $("scenarioControls"),
        complete: $("scenarioComplete"),
        progress: $("scenarioProgress"),
        counter: $("scenarioCounter"),
        counterText: (n, total) => `Scenario ${n} of ${total}`,
        doneText: "Scenarios Complete",
        finalLabel: "Finish Scenarios",
        dots: $$(".scenario-dots span"),
        gated: true,
        message: {
            el: $("scenarioMessage"),
            idle: "Choose the thought that feels closest.",
            answered: "Reflection revealed. Continue when you're ready."
        }
    });

    scenarioScreens.forEach((screen) => {
        const feedbackBox = screen.querySelector(".scenario-feedback");

        onChoose(screen.querySelectorAll(".scenario-choice"), (choice) => {
            feedbackBox.textContent = feedbackMessages[choice.dataset.feedback];
            feedbackBox.classList.add("visible");
            scenarios.markAnswered("Notice the reflection, then continue when you're ready.");
        });
    });
}


// ==========================================
// 4. THE PATTERN
// ==========================================

const cycleSteps = $$(".cycle-step");
const patternInfo = document.querySelector(".pattern-info");

if (cycleSteps.length > 0 && patternInfo && $("patternPrevious") && $("patternNext")) {
    const patternContent = [
        {
            status: "SEE",
            icon: "◉",
            title: "You see someone else's life.",
            description: "A post gives you a small, selected glimpse of another person's appearance, achievement, relationship, lifestyle, or success.",
            example: "“They seem to have everything together.”"
        },
        {
            status: "COMPARE",
            icon: "⇄",
            title: "Their life becomes a reference point.",
            description: "Instead of simply observing the post, you begin placing their experience beside your own. Their progress, appearance, or lifestyle can start to feel like a standard.",
            example: "“They're already there. Why am I not?”"
        },
        {
            status: "JUDGE",
            icon: "◇",
            title: "Comparison turns inward.",
            description: "The difference between their post and your current reality may become a judgment about yourself. You may feel behind, unattractive, unsuccessful, or not good enough.",
            example: "“Maybe I'm the one who isn't doing enough.”"
        },
        {
            status: "PRESENT",
            icon: "✦",
            title: "You may change what others see.",
            description: "Pressure can influence how you present yourself online. You might carefully select, edit, hide, or emphasize parts of your life to create a particular impression.",
            example: "“I want people to see me differently.”"
        },
        {
            status: "VALIDATE",
            icon: "♡",
            title: "Reactions can begin to feel meaningful.",
            description: "Likes, views, comments, and other reactions may temporarily reassure you that the version of yourself you presented is accepted or valued.",
            example: "“People liked it. Maybe I look okay after all.”"
        },
        {
            status: "REPEAT",
            icon: "↻",
            title: "Then the comparison begins again.",
            description: "The reassurance may not last. More scrolling brings more people to compare with, creating another opportunity to question your progress, appearance, or worth.",
            example: "“Maybe I need to keep up a little more.”"
        }
    ];

    const last = patternContent.length - 1;
    let currentStep = 0;

    function showPatternStep(index) {
        currentStep = index;
        const content = patternContent[index];

        cycleSteps.forEach((step, i) => {
            step.classList.toggle("active", i === index);
            step.setAttribute("aria-pressed", i === index);
        });

        // Restart the information animation
        patternInfo.classList.remove("animate");
        void patternInfo.offsetWidth;
        patternInfo.classList.add("animate");

        $("patternNumber").textContent = `STEP ${String(index + 1).padStart(2, "0")}`;
        $("patternStatus").textContent = content.status;
        $("patternIcon").textContent = content.icon;
        $("patternTitle").textContent = content.title;
        $("patternDescription").textContent = content.description;
        $("patternExample").textContent = content.example;
        $("patternStepCount").textContent = `${index + 1} / ${patternContent.length}`;

        $("patternPrevious").disabled = index === 0;
        $("patternNext").disabled = index === last;
    }

    cycleSteps.forEach((step, index) => {
        step.addEventListener("click", () => showPatternStep(index));
    });

    $("patternPrevious").addEventListener("click", () => {
        if (currentStep > 0) showPatternStep(currentStep - 1);
    });

    $("patternNext").addEventListener("click", () => {
        if (currentStep < last) showPatternStep(currentStep + 1);
    });

    showPatternStep(0);
}


// ==========================================
// 5. PRIVATE REFLECTION JOURNAL
// ==========================================

const reflectionScreens = $$(".reflection-screen[data-reflection]");

if (reflectionScreens.length > 0 && $("previousReflection") && $("nextReflection")) {
    createStepper({
        screens: reflectionScreens,
        prev: $("previousReflection"),
        next: $("nextReflection"),
        controls: $("reflectionControls"),
        complete: $("reflectionComplete"),
        progress: $("reflectionProgress"),
        counter: $("reflectionCounter"),
        counterText: (n, total) => `Reflection ${n} of ${total}`,
        doneText: "Reflection Complete",
        finalLabel: "Finish Reflection",
        dots: $$(".journal-dots span")
    });

    // Character counters
    $$(".reflection-textarea").forEach((textarea) => {
        const counter = textarea.closest(".journal-paper").querySelector(".character-count");

        function updateCount() {
            counter.textContent = `${textarea.value.length} / ${textarea.maxLength}`;
        }

        textarea.addEventListener("input", updateCount);
        updateCount();
    });
}


// ==========================================
// 6. BOUNDARY ACTION PLAN
// ==========================================

const boundaryScreens = $$(".boundary-screen[data-boundary-screen]");

if (boundaryScreens.length > 0 && $("previousBoundary") && $("nextBoundary")) {
    const previous = $("previousBoundary");
    const next = $("nextBoundary");
    const message = $("boundaryMessage");
    const builderSteps = $$(".builder-steps span");

    // Steps 1 and 2 are the same kind of choice: pick an option or type your own
    const picks = [
        {
            value: "",
            options: $$(".boundary-option"),
            custom: $("customBoundary"),
            dataKey: "boundary",
            idle: "Choose one option to continue.",
            chosen: "Boundary selected. Continue when you're ready.",
            customChosen: "Custom boundary added. Continue when you're ready."
        },
        {
            value: "",
            options: $$(".focus-option"),
            custom: $("customFocus"),
            dataKey: "focus",
            idle: "Choose what you want to focus on.",
            chosen: "Focus selected. Continue when you're ready.",
            customChosen: "Custom focus added. Continue when you're ready."
        }
    ];

    let currentStep = 0;

    function showBoundaryScreen(index) {
        currentStep = index;
        const total = boundaryScreens.length;

        setActive(boundaryScreens, index);
        setActive(builderSteps, index);

        $("boundaryStepText").textContent = `Step ${index + 1} of ${total}`;
        $("boundaryProgress").style.width = `${((index + 1) / total) * 100}%`;
        previous.disabled = index === 0;

        const pick = picks[index];

        if (pick) {
            next.disabled = pick.value === "";
            message.textContent = pick.value ? pick.chosen : pick.idle;
        } else {
            // Final screen: show the commitment
            $("commitmentBoundary").textContent = picks[0].value || "choose a healthier boundary";
            $("commitmentFocus").textContent = picks[1].value || "what matters to me";
        }

        $("boundaryControls").style.display = pick ? "grid" : "none";
    }

    picks.forEach((pick) => {
        onChoose(pick.options, (option) => {
            pick.value = option.dataset[pick.dataKey];
            if (pick.custom) pick.custom.value = "";
            next.disabled = false;
            message.textContent = pick.chosen;
        });

        if (!pick.custom) return;

        pick.custom.addEventListener("input", () => {
            const text = pick.custom.value.trim();

            if (text) setSelected(Array.from(pick.options), null);

            pick.value = text;
            next.disabled = text === "";
            message.textContent = text ? pick.customChosen : pick.idle;
        });
    });

    next.addEventListener("click", () => {
        const pick = picks[currentStep];

        if (pick && pick.value === "") return;
        if (currentStep < boundaryScreens.length - 1) showBoundaryScreen(currentStep + 1);
    });

    previous.addEventListener("click", () => {
        if (currentStep > 0) showBoundaryScreen(currentStep - 1);
    });

    showBoundaryScreen(0);
}


// ==========================================
// 7. TAKEAWAY
// ==========================================

const takeawayScreens = $$(".takeaway-screen[data-takeaway]");

if (takeawayScreens.length > 0 && $("previousTakeaway") && $("nextTakeaway")) {
    const takeawayFeedback = {
        strong:
            "Yes — this reflects the key idea. The issue is not simply seeing another person's experience. The pressure appears when their experience becomes a standard for judging your own worth, progress, or choices.",
        developing:
            "Look again at what is being measured. A useful question is: am I simply observing something online, or am I turning it into a standard for what my own life should look like?"
    };

    const takeaway = createStepper({
        screens: takeawayScreens,
        prev: $("previousTakeaway"),
        next: $("nextTakeaway"),
        controls: $("takeawayControls"),
        complete: $("takeawayComplete"),
        progress: $("takeawayProgress"),
        counter: $("takeawayCounter"),
        counterText: (n, total) => `Question ${n} of ${total}`,
        doneText: "Reflection Complete",
        finalLabel: "Finish",
        dots: $$(".takeaway-dots span"),
        gated: true,
        message: {
            el: $("takeawayMessage"),
            idle: "Choose one response.",
            answered: "Reflection revealed. Continue when you're ready."
        }
    });

    takeawayScreens.forEach((screen) => {
        const feedback = screen.querySelector(".takeaway-feedback");

        onChoose(screen.querySelectorAll(".takeaway-option"), (option) => {
            feedback.textContent = takeawayFeedback[option.dataset.understanding];
            feedback.classList.add("visible");
            takeaway.markAnswered("Notice the reflection, then continue.");
        });
    });
}


// ==========================================
// 8. RANDOM REMINDER (takeaway page)
// ==========================================

const finalReminder = $("finalReminder");
const anotherReminder = $("anotherReminder");

if (finalReminder && anotherReminder) {
    const reminders = [
        "Someone else's milestone is not a deadline for your own.",
        "Your life does not need to look like someone else's to have value.",
        "You don't have to edit yourself to become worthy of being seen.",
        "A number on a screen cannot measure your value.",
        "Protecting your peace can also be a form of progress.",
        "Accept where you are. Learn from where you've been. Keep becoming who you want to be."
    ];

    let previousIndex = 0;

    anotherReminder.addEventListener("click", () => {
        let index;

        do {
            index = Math.floor(Math.random() * reminders.length);
        } while (index === previousIndex && reminders.length > 1);

        previousIndex = index;
        finalReminder.classList.add("changing");

        setTimeout(() => {
            finalReminder.textContent = `“${reminders[index]}”`;
            finalReminder.classList.remove("changing");
        }, 220);
    });
}