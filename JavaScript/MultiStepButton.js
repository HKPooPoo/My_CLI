class MultiStepButton {
    /**
     * @param {HTMLElement} element The button element.
     * @param {string[]} labels Array of labels for each state. [Default, Click1, Click2, Action].
     *                          Example: ['COMMIT', 'COMMIT x 3', 'COMMIT x 2', 'EXECUTING...']
     * @param {Function} action Callback function to execute on final state.
     * @param {number} timeout Reset timeout in milliseconds (default 2000).
     */
    constructor(element, labels, action, timeout = 2000) {
        this.element = element;
        this.labels = labels;
        this.action = action;
        this.timeout = timeout;
        this.state = 0;
        this.timer = null;

        this.init();
    }

    init() {
        this.updateLabel();
        this.element.addEventListener('click', (e) => this.handleClick(e));
    }

    handleClick(e) {
        if (this.state < this.labels.length - 1) {
            // Advance state
            this.state++;
            this.updateLabel();
            this.resetTimer();

            // If we reached the final state (Action state), execute immediately?
            // User said: "REMOVE" -> "REMOVEx3" -> "REMOVEx2" -> "REMOVE!" (Action)
            // If labels are [0, 1, 2, 3], then state 3 is the action.
            if (this.state === this.labels.length - 1) {
                this.executeAction();
            }
        }
    }

    executeAction() {
        if (this.action) this.action();
        // Reset after a short delay or immediately? 
        // Let's hold the final text for a moment (e.g. 1s) then reset, or let the action handler reset it manually?
        // For simplicity, auto-reset after usual timeout.
        // But usually "EXECUTING..." implies async. 
        // The action might want to change text to "DONE" or reset.
        // We'll let the timer reset it strictly.
    }

    resetTimer() {
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => {
            this.state = 0;
            this.updateLabel();
        }, this.timeout);
    }

    updateLabel() {
        // this.element.textContent = this.labels[this.state];
        /*
        Replaced by below, such that
        new MultiStepButton(this.elements.btnCommit, ['<ruby>COMMIT<rt>UPLOAD</rt></ruby>', 'COMMIT x 3', 'COMMIT x 2', 'COMMIT !', 'UPLOADING...'], async () => {
        is acceptable in Blackboard.js
        */
        this.element.innerHTML = this.labels[this.state];

        // Update styling classes
        // Remove all state classes
        for (let i = 0; i < this.labels.length; i++) {
            this.element.classList.remove(`btn-state-${i}`);
        }
        // Add current state class
        this.element.classList.add(`btn-state-${this.state}`);

        // Update Sound Context for SoundManager
        // Logic: Check if element has 'data-sound-click-N' for current state
        // If yes, temporarily set 'data-sound-click' to that specific sound
        // If no, revert to default 'data-sound-click-default' (we need to store initial)

        if (!this.initialSound) {
            this.initialSound = this.element.getAttribute('data-sound-click');
        }

        const specificSound = this.element.getAttribute(`data-sound-click-${this.state}`);
        if (specificSound) {
            this.element.setAttribute('data-sound-click', specificSound);
        } else if (this.initialSound) {
            this.element.setAttribute('data-sound-click', this.initialSound);
        }
    }

    // External reset if needed
    reset() {
        if (this.timer) clearTimeout(this.timer);
        this.state = 0;
        this.updateLabel();
    }
}
