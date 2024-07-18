module.exports = {
  async beforeDelete(event) {
    const { deleteEntryIncludeLocalizationsAsync } = require ( "../../../../Helpers/Utils.js");
    await deleteEntryIncludeLocalizationsAsync(event, strapi, "causa"); 
  },
  async beforeCreate(event) {
    const { createEntryIncludeLocalizationsAsync } = require ( "../../../../Helpers/Utils.js");
    await createEntryIncludeLocalizationsAsync(event, strapi, "causa"); 
  },
};