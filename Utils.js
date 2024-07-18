/**
 * Asynchronously retrieves the available locales from the Strapi i18n plugin.
 *
 * @param {Object} strapi - The Strapi instance.
 * @return {Promise<Array<string>>} An array of locale codes.
 */
  const getAvailableLocalesAsync = async (strapi) => {

    const result = await strapi.plugins.i18n.services.locales.find();

    const locales  = result.map((l) => l.code)

    return locales
}

/**
 * Asynchronously deletes an entry and its associated localizations.
 *
 * @param {Object} event - The event object.
 * @param {Object} strapi - The Strapi instance.
 * @param {string} [entityName=""] - The name of the entity.
 * @return {Promise<void>} A promise that resolves when the deletion is complete.
 */
async function deleteEntryIncludeLocalizationsAsync(event, strapi, entityName ="" ) {  
    try {
      const entry = await strapi.db.query(`api::${entityName}.${entityName}`).findOne({
        select: ['id'],
        where: { id: event.params.where.id },
        populate: { localizations: true },
      });

      console.log(`========== api::${entityName}.${entityName} ==========`);
      console.log(entry);
  
      const deletedBefore = await strapi.db.query(`api::${entityName}.${entityName}`).deleteMany({
        where: {
          id: { $in: entry.localizations.map(x => x.id), },
        },
      });

      console.log("=========deletedBefore===========");
      console.log(deletedBefore);
    } catch (error) {
      console.log(`ERROR DELETE api::${entityName}.${entityName}`, error);
    }
  }


/**
 * Asynchronously creates an entry and its associated localizations.
 *
 * @param {Object} event - The event object.
 * @param {Object} strapi - The Strapi instance.
 * @param {string} [entityName=""] - The name of the entity.
 * @return {Promise<void>} A promise that resolves when the creation is complete.
 */
async function createEntryIncludeLocalizationsAsync(event, strapi, entityName ="" ) {  
    
    const { params } = event;

    let localizationsIdEntryExistsActual = params.data.localizations;

    try {
      // Obter lista de idiomas configuradas
      let availableLocales = await getAvailableLocalesAsync(strapi);
      let idToLinkEntries = []
      
      // filtrar idiomas disponíveism removendo a localização atual a ser inserido
       availableLocales = availableLocales.filter((l) => l != params.data.locale);
      
      // Obter dados de todas traduções existente na tabela
      if (localizationsIdEntryExistsActual.length > 0) {
        const entries = await strapi.db.query(`api::${entityName}.${entityName}`).findMany({
            select: ['id','locale'],
            where: {
                id: { $in: localizationsIdEntryExistsActual },
              },
          });
        
        idToLinkEntries = entries.map((l) => l.id);
        let localeToExclude = entries.map((l) => l.locale);
        let localeToInclude = [];

        // filtrar idiomas disponíveis removendo os idiomas ja existentes
        for (let i = 0; i < availableLocales.length; i++) {
            if (!localeToExclude.includes(availableLocales[i]) ) {
                localeToInclude.push(availableLocales[i]);
            } 
        }
        // atribuir novo valor para idiomas disponíveis, após filtrar o idioma a ser inserido 
        // e localizações já inseridos
        availableLocales = localeToInclude;
      }

      // copiar dados do registo atual, alterando o locale para cada idiomas disponíveis
      const allDataToInsert = availableLocales.map((locale) => {
        return {...params.data, locale } ;
      });

      // inserir registos para localizações não existentes, deferentes dos já inseridos e do registo a ser inserido
      const newEntries = await strapi.db.query(`api::${entityName}.${entityName}`).createMany({
            data: allDataToInsert
        });

        //juntar os registos antes inseridos aos registos inseridos no beforeCreate
        // e fazer link oa registo crriado, atraves do "localizations"
        idToLinkEntries =[...idToLinkEntries, ...newEntries.ids]
        event.params.data = {...params.data, localizations: idToLinkEntries} 
    } catch (error) {
        console.log(`ERROR ON CREATE api::${entityName}.${entityName}`, error);    }
  }

  /*async function deleteManyEntriesIncludeLocalizationsAsync(event, strapi, entityName ="" ) {
    console.log('================beforeDeleteMany====================');
    console.log(event.params.where);
    const entries = await strapi.db.query(`api::causa.causa`).findMany({
      select: ['id','locale'],
      where: event.params.where,
    }); 
    console.log('============ffff========================');
    console.log(entries);
    console.log('================ ====================');
    //const { deleteEntryIncludeLocalizationsAsync } = require ( "../../../../Helpers/Utils.js");
    //await deleteEntryIncludeLocalizationsAsync(event, strapi, "causa"); 
  }*/
  module.exports =  {
    getAvailableLocalesAsync, deleteEntryIncludeLocalizationsAsync, createEntryIncludeLocalizationsAsync
  };