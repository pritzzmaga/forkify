import { API_URL } from './config';
import { RESULTS_PER_PAGE, KEY } from './config';
import { getJSON, sendJSON } from './helper';
import resultsView from './views/resultsView';

export const state = {
  recipe: {},
  search: {
    query: '',
    results: [],
    page: 1,
    resultsPerPage: RESULTS_PER_PAGE,
  },
  bookmarks: [],
};

export const loadRecipe = async function (id) {
  try {
    const data = await getJSON(`${API_URL}${id}&key=${KEY}`);
    //   const res = await fetch(`${API_URL}/${id}`);
    //   const data = await res.json();

    //console.log('in model', res, data);
    //   if (!res.ok) {
    //     throw new Error(`${data.message} ${res.status}`);
    //   }
    const { recipe } = data.data;
    state.recipe = {
      id: recipe.id,
      title: recipe.title,
      publisher: recipe.publisher,
      sourceUrl: recipe.source_url,
      image: recipe.image_url,
      servings: recipe.servings,
      cookingTime: recipe.cooking_time,
      ingredients: recipe.ingredients,
    };
    if (state.bookmarks.some(b => b.id === id)) {
      state.recipe.bookmarked = true;
    } else {
      state.recipe.bookmarked = false;
    }
  } catch (err) {
    throw err;
  }
};

export const loadSearchResults = async function (query) {
  try {
    const data = await getJSON(`${API_URL}?search=${query}&key=${KEY}`);
    console.log(data);

    state.search.results = data.data.recipes.map(cur => {
      return {
        id: cur.id,
        title: cur.title,
        publisher: cur.publisher,
        image: cur.image_url,
        ...(cur.key && { key: cur.key }),
      };
    });
    console.log(state.search.results);
    resultsView.renderSpinner();
  } catch (err) {
    console.log(`model`, err);
    throw err;
  }
};

export const getSearchResultPage = function (page = state.search.page) {
  state.search.page = page;
  const start = (page - 1) * RESULTS_PER_PAGE;
  const end = page * RESULTS_PER_PAGE;
  return state.search.results.slice(start, end);
};
//loadSearchResults('pasta');

export const updateServings = function (newServings) {
  console.log(state);
  state.recipe.ingredients.forEach(ing => {
    ing.quantity = (ing.quantity * newServings) / state.recipe.servings;
  });

  state.recipe.servings = newServings;
};

const persistBookmarks = function () {
  localStorage.setItem('bookmarks', JSON.stringify(state.bookmarks));
};

export const addBookmark = function (recipe) {
  state.bookmarks.push(recipe);
  if (recipe.id === state.recipe.id) {
    state.recipe.bookmarked = true;
  }
  persistBookmarks();
  console.log(state);
};

export const deleteBookmark = function (id) {
  const ind = state.bookmarks.findIndex(el => el.id === id);
  state.bookmarks.splice(ind, 1);

  if (id === state.recipe.id) state.recipe.bookmarked = false;
  persistBookmarks();
};

const createRecipeObject = function (data) {
  const newRecipe = data.data.recipe;
  return {
    title: newRecipe.title,
    sourceUrl: newRecipe.source_url,
    image: newRecipe.image_url,
    publisher: newRecipe.publisher,
    cookingTime: +newRecipe.cooking_time,
    servings: +newRecipe.servings,
    id: newRecipe.id,
    ingredients: newRecipe.ingredients,
    ...(newRecipe.key && { key: newRecipe.key }),
  };
};

export const uploadRecipe = async function (newRecipe) {
  try {
    console.log(Object.entries(newRecipe));
    const newIngredients = Object.entries(newRecipe)
      .filter(entry => entry[0].startsWith('ingredient') && entry[1] !== '')
      .map(ing => {
        const ingArr = ing[1].replaceAll(' ', '').split(',');
        if (ingArr.length !== 3) throw new Error('Wrong Format!');
        const [quantity, unit, description] = ingArr;
        return { quantity: quantity ? +quantity : null, unit, description };
      });
    const recipe = {
      title: newRecipe.title,
      source_url: newRecipe.sourceUrl,
      image_url: newRecipe.image,
      publisher: newRecipe.publisher,
      cooking_time: +newRecipe.cookingTime,
      servings: +newRecipe.servings,
      ingredients: newIngredients,
    };
    console.log(recipe);
    const data = await sendJSON(`${API_URL}?key=${KEY}`, recipe);
    console.log(data);
    state.recipe = createRecipeObject(data);
    addBookmark(state.recipe);
  } catch (err) {
    throw err;
  }
};

const init = function () {
  const storage = localStorage.getItem('bookmarks');
  if (storage) state.bookmarks = JSON.parse(storage);
};
init();
