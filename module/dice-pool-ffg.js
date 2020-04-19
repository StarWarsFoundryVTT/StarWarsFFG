const ABILITY_ICON = "modules/special-dice-roller/public/images/sw/green.png";
const PROFICIENCY_ICON = "modules/special-dice-roller/public/images/sw/yellow.png";
const BOOST_ICON = "modules/special-dice-roller/public/images/sw/blue.png";
const SETBACK_ICON = "modules/special-dice-roller/public/images/sw/black.png";
const DIFFICULTY_ICON = "modules/special-dice-roller/public/images/sw/purple.png";
const CHALLENGE_ICON = "modules/special-dice-roller/public/images/sw/red.png";
const FORCE_ICON = "modules/special-dice-roller/public/images/sw/whiteHex.png";

/**
 * Dice pool utility specializing in the FFG special dice
 */
export class DicePoolFFG {
    constructor(obj) {
        if (obj === undefined) {
            obj = {};
        }
        if (typeof(obj) === "string") {
            obj = JSON.parse(obj);
        }
        this.ability = obj.ability || 0;
        this.proficiency = obj.proficiency || 0;
        this.boost = obj.boost || 0;
        this.setback = obj.setback || 0;
        this.difficulty = obj.difficulty || 0;
        this.challenge = obj.challenge || 0;
        this.force = obj.force || 0;
    }

    /**
     * Upgrade the dice pool, converting any remaining ability dice into proficiency
     * dice or adding an ability die if none remain.
     * @param times the number of times to perform this operation, defaults to 1
     */
    upgrade(times) {
        if (times === undefined) {
            times = 1;
        }
        for (let i = 0; i < times; i++) {
            if (this.ability > 0) {
                this.ability--;
                this.proficiency++;
            } else {
                this.ability++;
            }
        }
    }
    /**
     * Upgrade the dice pool's difficulty, converting any remaining difficulty dice
     * into challenge dice or adding an difficulty die if none remain.
     * @param times the number of times to perform this operation, defaults to 1
     */
    upgradeDifficulty(times) {
        if (times === undefined) {
            times = 1;
        }
        for (let i = 0; i < times; i++) {
            if (this.difficulty > 0) {
                this.difficulty--;
                this.challenge++;
            } else {
                this.difficulty++;
            }
        }
    }

    /**
     * Transform the dice pool into a rollable expression
     * @returns {string} a dice expression that can be used to roll the dice pool
     */
    renderDiceExpression() {
        return [
            "a".repeat(this.ability),
            "p".repeat(this.proficiency),
            "b".repeat(this.boost),
            "s".repeat(this.setback),
            "d".repeat(this.difficulty),
            "c".repeat(this.challenge),
            "f".repeat(this.force)
        ].join("");
    }

    /**
     * Create a preview of the dice pool using images
     * @param container {HTMLElement} where to place the preview. A container will be generated if this is undefined
     * @returns {HTMLElement}
     */
    renderPreview(container) {
        if (container === undefined) {
            container = document.createElement("div");
            container.classList.add("dice-pool");
        }
        this._addIcons(container, ABILITY_ICON, this.ability);
        this._addIcons(container, PROFICIENCY_ICON, this.proficiency);
        this._addIcons(container, BOOST_ICON, this.boost);
        this._addIcons(container, SETBACK_ICON, this.setback);
        this._addIcons(container, DIFFICULTY_ICON, this.difficulty);
        this._addIcons(container, CHALLENGE_ICON, this.challenge);
        this._addIcons(container, FORCE_ICON, this.force);
        return container;
    }

    _addIcons(container, icon, times) {
        for (let i = 0; i < times; i++) {
            const img = document.createElement("img");
            img.src = icon;
            img.width = 48;
            img.height = 48;
            container.appendChild(img);
        }
    }

    /**
     * Search the passed container for inputs that contain dice pool information
     * @param container the container where the inputs are located
     * @returns {DicePoolFFG}
     */
    static fromContainer(container) {
        return new DicePoolFFG({
            ability: container.querySelector('[name="ability"]').value,
            proficiency: container.querySelector('[name="proficiency"]').value,
            difficulty: container.querySelector('[name="difficulty"]').value,
            challenge: container.querySelector('[name="challenge"]').value,
            boost: container.querySelector('[name="boost"]').value,
            setback: container.querySelector('[name="setback"]').value,
            force: container.querySelector('[name="force"]').value,
        })
    }
}
