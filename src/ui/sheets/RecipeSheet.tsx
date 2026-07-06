import type { Recipe } from '../../core/types';
import { store } from '../../core/store';
import { toast } from '../hooks';
import Sheet from '../Sheet';

export default function RecipeSheet({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  return (
    <Sheet onClose={onClose}>
      <span className="pill">{recipe.c} · {recipe.tag}{recipe.user ? ' · added by SOEN' : ''}</span>
      <h3 className="serif">{recipe.n}</h3>
      <div className="sub">{recipe.mac}</div>
      <div className="sec"><h6>Ingredients</h6>
        {recipe.ing.map((x, i) => <div className="row" key={i}><span>· {x}</span></div>)}
      </div>
      <div className="sec"><h6>Method</h6>
        {recipe.st.map((x, j) => (
          <div className="step" key={j}>
            <div className="n">{j + 1}</div>
            <div className="c"><small style={{ fontSize: '.74rem', color: 'var(--ink)' }}>{x}</small></div>
          </div>
        ))}
      </div>
      {recipe.user && recipe.id && (
        <button className="btnS" onClick={() => { store.removeRecipe(recipe.id!); toast('Recipe removed'); onClose(); }}>
          Remove from my recipes
        </button>
      )}
    </Sheet>
  );
}
