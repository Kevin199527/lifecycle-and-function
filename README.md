Aqui está uma explicação detalhada do código. Isso ajudará você a entender a funcionalidade e a lógica do código no futuro.


# Explicação do Código

Este projeto contém utilitários e lifecycles personalizados para gerenciar entradas com localizações no Strapi. O objetivo principal é criar e excluir entradas automaticamente em múltiplos idiomas configurados, mantendo a consistência das traduções.

## Utils Code

### `getAvailableLocalesAsync`

Este utilitário obtém a lista de idiomas disponíveis configurados no plugin i18n do Strapi.

```javascript
/**
 * Asynchronously retrieves the available locales from the Strapi i18n plugin.
 *
 * @param {Object} strapi - The Strapi instance.
 * @return {Promise<Array<string>>} An array of locale codes.
 */
const getAvailableLocalesAsync = async (strapi) => {
  const result = await strapi.plugins.i18n.services.locales.find();
  const locales = result.map((l) => l.code);
  return locales;
}
```

### `deleteEntryIncludeLocalizationsAsync`

Este utilitário exclui uma entrada e suas localizações associadas. Quando uma entrada é excluída, todas as suas traduções também são excluídas.

```javascript
/**
 * Asynchronously deletes an entry and its associated localizations.
 *
 * @param {Object} event - The event object.
 * @param {Object} strapi - The Strapi instance.
 * @param {string} [entityName=""] - The name of the entity.
 * @return {Promise<void>} A promise that resolves when the deletion is complete.
 */
async function deleteEntryIncludeLocalizationsAsync(event, strapi, entityName = "") {  
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
        id: { $in: entry.localizations.map(x => x.id) },
      },
    });

    console.log("=========deletedBefore===========");
    console.log(deletedBefore);
  } catch (error) {
    console.log(`ERROR DELETE api::${entityName}.${entityName}`, error);
  }
}
```

### `createEntryIncludeLocalizationsAsync`

Este utilitário cria uma entrada e suas localizações associadas. Quando uma entrada é criada, ela é automaticamente criada em todos os idiomas disponíveis configurados, exceto no idioma já existente.

```javascript
/**
 * Asynchronously creates an entry and its associated localizations.
 *
 * @param {Object} event - The event object.
 * @param {Object} strapi - The Strapi instance.
 * @param {string} [entityName=""] - The name of the entity.
 * @return {Promise<void>} A promise that resolves when the creation is complete.
 */
async function createEntryIncludeLocalizationsAsync(event, strapi, entityName = "") {  
  const { params } = event;
  let localizationsIdEntryExistsActual = params.data.localizations;

  try {
    // Obter lista de idiomas configuradas
    let availableLocales = await getAvailableLocalesAsync(strapi);
    let idToLinkEntries = [];
    
    // filtrar idiomas disponíveis, removendo a localização atual a ser inserido
    availableLocales = availableLocales.filter((l) => l != params.data.locale);
    
    // Obter dados de todas traduções existentes na tabela
    if (localizationsIdEntryExistsActual.length > 0) {
      const entries = await strapi.db.query(`api::${entityName}.${entityName}`).findMany({
        select: ['id', 'locale'],
        where: {
          id: { $in: localizationsIdEntryExistsActual },
        },
      });
      
      idToLinkEntries = entries.map((l) => l.id);
      let localeToExclude = entries.map((l) => l.locale);
      let localeToInclude = [];

      // filtrar idiomas disponíveis, removendo os idiomas já existentes
      for (let i = 0; i < availableLocales.length; i++) {
        if (!localeToExclude.includes(availableLocales[i])) {
          localeToInclude.push(availableLocales[i]);
        } 
      }
      // atribuir novo valor para idiomas disponíveis, após filtrar o idioma a ser inserido 
      // e localizações já inseridas
      availableLocales = localeToInclude;
    }

    // copiar dados do registro atual, alterando o locale para cada idioma disponível
    const allDataToInsert = availableLocales.map((locale) => {
      return { ...params.data, locale };
    });

    // inserir registros para localizações não existentes, diferentes dos já inseridos e do registro a ser inserido
    const newEntries = await strapi.db.query(`api::${entityName}.${entityName}`).createMany({
      data: allDataToInsert
    });

    // juntar os registros antes inseridos aos registros inseridos no beforeCreate
    // e fazer link ao registro criado, através do "localizations"
    idToLinkEntries = [...idToLinkEntries, ...newEntries.ids];
    event.params.data = { ...params.data, localizations: idToLinkEntries };
  } catch (error) {
    console.log(`ERROR ON CREATE api::${entityName}.${entityName}`, error);
  }
}
```

### Exportação de Utilitários

```javascript
module.exports = {
  getAvailableLocalesAsync, 
  deleteEntryIncludeLocalizationsAsync, 
  createEntryIncludeLocalizationsAsync
};
```

//Lifecycle Code

Estes lifecycles são executados antes da criação e exclusão de uma entrada para garantir que as localizações associadas sejam gerenciadas adequadamente.

### beforeDelete

Este lifecycle é executado antes da exclusão de uma entrada para excluir todas as localizações associadas.

```javascript
module.exports = {
  async beforeDelete(event) {
    const { deleteEntryIncludeLocalizationsAsync } = require("../../../../Helpers/Utils.js");
    await deleteEntryIncludeLocalizationsAsync(event, strapi, "causa");
  },
  async beforeCreate(event) {
    const { createEntryIncludeLocalizationsAsync } = require("../../../../Helpers/Utils.js");
    await createEntryIncludeLocalizationsAsync(event, strapi, "causa");
  },
};
```

//beforeCreate

Este lifecycle é executado antes da criação de uma entrada para criar localizações para todos os idiomas disponíveis, exceto o idioma atual.
