/**
 * Give a custom, Star Wars FFG tooltip when qualities, attachments, upgrades, etc are hovered (after sending to chat)
 * @param event
 */
export function itemPillHover(event) {
  event.preventDefault();
  const li = $(event.currentTarget);
  const itemName = li.data("item-embed-name");
  const itemImage = li.data("item-embed-img");
  const itemType = li.data("item-type");
  const itemRanks = li.data("item-ranks");
  let desc = li.data("desc");
  let descRanks = "";
  if (itemType === "itemattachment") {
    const rarity = li.data("rarity");
    const price = li.data("price");
    if (price) {
      desc = `<span class="statt" title="Price"><i class="fa-solid fa-dollar-sign"></i>${price}</span>${desc}`
    }
    if (rarity) {
      desc = `<span class="stat stat-right" title="Rarity"><i class="fa-solid fa-magnifying-glass"></i>${rarity}</span>${desc}`
    }

    // if the item has embedded mods, pull the data and add it to the description
    let modNames = li.data("mod-names");
    let modDescs = li.data("mod-descs");
    let modActives = li.data("mod-actives");
    if (modNames) {
      modNames = modNames.split("~");
      modDescs = modDescs.split("~");
      modActives = modActives.split("~");
      CONFIG.logger.debug(modNames);
      CONFIG.logger.debug(modDescs);
      CONFIG.logger.debug(modActives);
      let newDesc = `<hr><b>Mods</b>:<br>`;
      for (let i = 0; i < modNames.length - 1; i++) {
        if (modActives[i] === "true") {
          modNames[i] = `<i class="fa-solid fa-user-check" title="Installed"></i>&nbsp;${modNames[i]}`;
        } else {
          modNames[i] = `<i class="fa-duotone fa-solid fa-user-xmark" title="Not Installed"></i>&nbsp;${modNames[i]}`;
        }
        newDesc += `<u>${modNames[i]}</u>:&nbsp;${modDescs[i]}<br>`;
      }
      desc += newDesc;
    }
  }
  if (itemRanks > 0) {
    descRanks = `${itemRanks} ranks`;
  } else {
    if (!["specialization", "signatureAbility", "itemattachment"].includes(itemType)) {
      descRanks = "Not ranked";
    }
  }
  let embeddedContent = `
    <section class="chat-msg-tooltip content">
      <section class="header">
        <img class="tooltip-img" src="${itemImage}"/>
        <div class="title">${itemName}</div>
      </section>
      <section class="description">
        ${desc}
      </section>
      <section class="ranks">
        ${descRanks}
      </section>
    </section>
  `;
  if (itemType !== undefined) {
    li.attr("data-tooltip", embeddedContent);
  }
}
