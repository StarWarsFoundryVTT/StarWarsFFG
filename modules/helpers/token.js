export function registerTokenControls() {
  game.settings.register("starwarsffg", "showMinionCount", {
    name: game.i18n.localize("SWFFG.Settings.showMinionCount.Name"),
    hint: game.i18n.localize("SWFFG.Settings.showMinionCount.Hint"),
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
    onChange: (rule) => window.location.reload()
  });
  game.settings.register("starwarsffg", "showAdversaryCount", {
    name: game.i18n.localize("SWFFG.Settings.showAdversaryCount.Name"),
    hint: game.i18n.localize("SWFFG.Settings.showAdversaryCount.Hint"),
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
    onChange: (rule) => window.location.reload()
  });
    game.settings.register("starwarsffg", "adversaryItemName", {
    name: game.i18n.localize("SWFFG.Settings.AdversaryItemName.Name"),
    hint: game.i18n.localize("SWFFG.Settings.AdversaryItemName.Hint"),
    scope: "world",
    config: true,
    default: "Adversary",
    type: String,
    onChange: (rule) => window.location.reload()
  });
}

export function drawMinionCount(token) {
  if (!game.settings.get("starwarsffg", "showMinionCount")) {
    return;
  }
  const borderWidth = 0.35;
  const friendlyColor = "0x00A2E84D";
  const enemyColor = "0x8800154D";
  const overflowColor = "0xDAA520";
  // calculate total and alive numbers of minions
  const curCount = Math.max(token.actor.system.quantity.value, 0);
  const maxCount = token.actor.system.quantity.max;
  const maxRender = 6;

  // attempt to draw it on the token directly
  // check for existing copies of the container
  if (!token.children.find(i => i.name === "minionCount")) {
    const countContainer = new PIXI.Container();
    countContainer.name = "minionCount";
    token.minionCount = token.addChild(countContainer);
  } else {
    token.minionCount.removeChildren().forEach(i => i.destroy());
  }

  const tokenWidth = token.w;
  const markerWidth = 7;
  const markerHeight = 15;
  const insideGap = 5;
  const availableSpace = tokenWidth - ((markerWidth * maxCount) + (insideGap * (maxCount - 1)));
  const outsideGap = availableSpace / 2;
  CONFIG.logger.debug(`drawing minion count. calculated tokenWidth: ${tokenWidth}, insideGap: ${insideGap}, availableSpace: ${availableSpace}, outsideGap: ${outsideGap}`);
  CONFIG.logger.debug(`curCount: ${curCount}, maxCount: ${maxCount}`);

  if (maxCount > maxRender) {
    const text = new PIXI.Text(
      "∞",
      {
        fontFamily: "Arial",
        fontSize: 48,
        fill: overflowColor,
        align: "center",
        stroke: "0x000000",
        strokeThickness: 1,
        fontWeight: "bold" ,
      }
    );
    text.anchor.set(0.5);
    text.x = tokenWidth / 2;
    text.y = token.h - 12;
    token.minionCount.addChild(text);
  } else {
    for (let i = 0; i < curCount; i++) {
      const element = new PIXI.Graphics();
      // add the border
      element.lineStyle(borderWidth, "0x000000", 1);
      // draw the rectangle
      element.beginFill(friendlyColor);
      element.drawRoundedRect(0, 0, markerWidth, markerHeight, 2);
      element.endFill();
      element.endFill();
      // position it
      element.x = (i * (markerWidth + insideGap)) + outsideGap;
      element.y = token.h - markerHeight - 2;
      // add it to the container
      token.minionCount.addChild(element);
    }

    for (let i = 0; i < maxCount - curCount; i++) {
      const element = new PIXI.Graphics();
      // add the border
      element.lineStyle(borderWidth, "0x000000", 1);
      // draw the rectangle
      element.beginFill(enemyColor);
      element.drawRoundedRect(0, 0, markerWidth, markerHeight, 2);
      element.endFill();
      // position it
      element.x = ((i + curCount) * (markerWidth + insideGap)) + outsideGap;
      element.y = token.h - markerHeight - 2;
      // add it to the container
      token.minionCount.addChild(element);
    }
  }
}

export function drawAdversaryCount(token) {
  if (!game.settings.get("starwarsffg", "showAdversaryCount")) {
    return;
  }
  const friendlyColor = "0x00A2E84D";
  // TODO: this should be a configurable value so non-English users can use it
  const itemName = game.settings.get("starwarsffg", "adversaryItemName");
  const adversaryItems = token?.actor?.items?.filter(i => i.name === itemName) || [];
  let adversaryLevel = 0;
  adversaryItems.forEach(function (item) {
    adversaryLevel += item?.system?.ranks?.current || 0;
  });
  if (adversaryLevel > 0) {
    // attempt to draw it on the token directly
    // check for existing copies of the container
    if (!token.children.find(i => i.name === "adversaryLevel")) {
      const countContainer = new PIXI.Container();
      countContainer.name = "adversaryLevel";
      token.adversaryLevel = token.addChild(countContainer);
    } else {
      token.adversaryLevel.removeChildren().forEach(i => i.destroy());
    }
    const segmentLength = 15;
    const tokenHeight = token.h;
    const tokenWidth = token.w;
    let height = tokenHeight - 8;
    const rankWidth = 4;
    for (let i = 0; i < 2; i++) {
      const element = new PIXI.Graphics();
      element.lineStyle(rankWidth, friendlyColor, 1); // 2 pixels wide, white color, full opacity
      // Move to the start point
      element.moveTo((tokenWidth / 2) - segmentLength, height);
      // Draw lines to form the shape
      element.lineTo((tokenWidth / 2), height - segmentLength);
      element.lineTo((tokenWidth / 2) + segmentLength, height);
      token.adversaryLevel.addChild(element);
      height -= 8;
    }
    // add the text
    const text = new PIXI.Text(adversaryLevel, { fontFamily: "Arial", fontSize: 14, fill: friendlyColor, align: "center", strokeThickness: 1, fontWeight: "bold" });
    text.anchor.set(0.5);
    text.x = tokenWidth / 2;
    text.y = tokenHeight - 10;
    token.adversaryLevel.addChild(text);
  }
}
