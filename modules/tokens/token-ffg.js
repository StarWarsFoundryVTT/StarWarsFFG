export class TokenFFG extends foundry.canvas.placeables.Token {
  /** @override */
  _refreshTurnMarker(wantMarkerActive=false) {
    CONFIG.logger.debug(`Refreshing ${this.name}...`);
    // Should a Turn Marker be active?
    const {turnMarker} = this.document;
    const markersEnabled = CONFIG.Combat.settings.turnMarker.enabled
      && (turnMarker.mode !== CONST.TOKEN_TURN_MARKER_MODES.DISABLED);
    // custom logic
    const isClaimed = game.combat?.combatant?.claimed;
    const claimant = game.combat?.combatants.find(i => i.id === isClaimed);
    // end custom logic

    CONFIG.logger.debug(`Slot claimed: ${isClaimed}`);
    // Activate a Turn Marker
    if (markersEnabled && wantMarkerActive || (isClaimed && claimant.actorId === this.actor.id)) {
      if (!this.turnMarker) this.turnMarker = this.addChildAt(new foundry.canvas.placeables.tokens.TokenTurnMarker(this), 0);
      canvas.tokens.turnMarkers.add(this);
      this.turnMarker.draw();
    }
    else if (this.turnMarker || !game.combat) {
      // Remove a Turn Marker
      canvas.tokens.turnMarkers?.delete(this);
      this.turnMarker?.destroy();
      this.turnMarker = null;
    }
  }
}
