export function registerChatMessageRender(callback) {
  Hooks.on("renderChatMessageHTML", callback);
}

export function bindChatAction(html, eventName, selector, callback) {
  html.addEventListener(eventName, event => {
    const target = event.target.closest(selector);
    if (target && html.contains(target)) callback(event, target);
  });
}
