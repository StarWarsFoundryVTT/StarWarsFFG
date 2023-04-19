export default class FFGActiveEffect extends ActiveEffect {
    // used to apply active effects. we want to hook custom effects for custom logic
    apply(actor, change) {
        // TODO: this function can probably be removed (perhaps except the super call?)
        let key = change.key.split('.');
        if (key[0] === "career_skill") {
            // this isn't really doing anything but represents how we could apply custom logic between the
            //  active effect definition and usage
            change.key = 'system.skills.Charm.careerskill';
        } else if (key[0] === "skill_rank") {
            // also not doing anything but demonstrates modifying skill ranks
            change.key = 'system.skills.Charm.rank';
        }
        super.apply(actor, change);
    }
}