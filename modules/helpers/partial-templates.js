export default class TemplateHelpers {
  static async preload() {
    const templatePaths = ["systems/starwarsffg/templates/parts/shared/ffg-modifiers.html"];

    return loadTemplates(templatePaths);
  }
}
