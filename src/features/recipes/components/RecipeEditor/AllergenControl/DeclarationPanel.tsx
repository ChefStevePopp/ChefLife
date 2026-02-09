import React from 'react';
import { Shield, FileCheck, Clock, AlertTriangle, ChefHat, Scale } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AllergenBadge } from '@/features/allergens/components/AllergenBadge';
import { ALLERGENS } from '@/features/allergens/constants';
import type { AllergenType } from '@/features/allergens/types';
import type { AllergenDeclaration, AllergenWithContext } from './types';
import type { Recipe } from '../../../types/recipe';

interface DeclarationPanelProps {
  /** The computed declaration (contains + mayContain + crossContactNotes) */
  declaration: AllergenDeclaration;
  /** Full context for each allergen (source, tier, notes) */
  allergensWithContext: AllergenWithContext[];
  /** The recipe being declared */
  recipe: Recipe;
  /** Whether the declaration has unsaved changes vs what's in the DB */
  hasUnsavedChanges: boolean;
  /** Called when operator confirms the declaration — triggers save */
  onConfirmDeclaration?: () => void;
}

/**
 * =============================================================================
 * DECLARATION PANEL — The Legal Bond
 * =============================================================================
 * This is NOT a data editor. This is the legal document that stands between
 * the operator and their customers. It is the output of everything on the
 * left side — a read-only representation of what will be declared.
 * 
 * CRITICAL LEGAL FRAMING:
 * ChefLife is the conduit, NOT the source. The declaration states:
 *   "The operator declares this information is accurate based on THEIR
 *    ingredient data and THEIR professional knowledge."
 * ChefLife presents. The operator declares. The customer relies.
 * 
 * IDENTITY: UUID only. No names, no emails. This prevents doxxing while
 * maintaining cryptographic traceability through auth.uid(). The UUID can
 * be resolved to a person through the organization's records if needed
 * for legal proceedings — but it's never exposed in the UI.
 *
 * FUTURE (Auth Identity Bridge):
 * When team members have linked auth accounts, declarations will be
 * stored in recipe_allergen_declarations with full metadata: user_id,
 * declared_at, recipe_version, ingredient_hash, ip_address.
 * =============================================================================
 */
export const DeclarationPanel: React.FC<DeclarationPanelProps> = ({
  declaration,
  allergensWithContext,
  recipe,
  hasUnsavedChanges,
  onConfirmDeclaration,
}) => {
  const { user, organization } = useAuth();
  
  const containsAllergens = allergensWithContext.filter(a => a.tier === 'contains');
  const mayContainAllergens = allergensWithContext.filter(a => a.tier === 'mayContain');
  const ingredientCount = recipe.ingredients?.length || 0;
  
  // Identity: UUID only — no names, no emails in the declaration
  const userId = user?.id || 'unknown';
  const userRole = user?.user_metadata?.role || 'operator';
  const organizationName = organization?.name || '';

  // Previous declaration state
  // allergen_declared_at is the definitive record that a declaration was saved.
  // More reliable than re-reading booleans, which may not have stabilized
  // after auto-sync render cycles.
  const hasPreviousDeclaration = !!recipe.allergen_declared_at;
  const hasAnyAllergens = declaration.contains.length > 0 || declaration.mayContain.length > 0;
  
  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 flex flex-col sticky top-4">
      
      {/* ================================================================
       * DOCUMENT HEADER
       * ================================================================ */}
      <div className="p-5 border-b border-gray-700">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-rose-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-white">Allergen Declaration</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Legal record of allergen disclosure for this recipe
            </p>
          </div>
          
          {/* Status indicator */}
          {hasUnsavedChanges ? (
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex-shrink-0">
              <AlertTriangle className="w-3 h-3" />
              Pending
            </span>
          ) : hasPreviousDeclaration ? (
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex-shrink-0">
              <FileCheck className="w-3 h-3" />
              Declared
            </span>
          ) : hasAnyAllergens ? (
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 flex-shrink-0">
              <AlertTriangle className="w-3 h-3" />
              Undeclared
            </span>
          ) : null}
        </div>
      </div>

      {/* ================================================================
       * RECIPE IDENTITY BLOCK
       * ================================================================ */}
      <div className="px-5 py-3 border-b border-gray-700/50 bg-gray-800/30">
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <ChefHat className="w-3.5 h-3.5" />
            <span className="text-gray-300 font-medium truncate max-w-[200px]">{recipe.name || 'Untitled Recipe'}</span>
          </span>
          <span className="text-gray-600">•</span>
          <span>{ingredientCount} ingredient{ingredientCount !== 1 ? 's' : ''}</span>
          {recipe.version && (
            <>
              <span className="text-gray-600">•</span>
              <span>v{recipe.version}</span>
            </>
          )}
        </div>
      </div>
      
      {/* ================================================================
       * DECLARATION BODY — The Legal Statement
       * ================================================================ */}
      <div className="flex-1 p-5 space-y-5">
        
        {!hasAnyAllergens ? (
          /* No allergens in your data */
          <div className="text-center py-8">
            <Shield className="w-10 h-10 text-emerald-400/40 mx-auto mb-3" />
            <p className="text-sm text-gray-300 font-medium">No allergens in your data</p>
            <p className="text-xs text-gray-500 mt-1">
              Based on {ingredientCount} ingredient{ingredientCount !== 1 ? 's' : ''} in this recipe
            </p>
          </div>
        ) : (
          <>
            {/* CONTAINS statement */}
            {declaration.contains.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <h4 className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
                    This recipe contains
                  </h4>
                </div>
                <div className="pl-4 border-l-2 border-rose-500/30">
                  <div className="flex flex-wrap gap-2">
                    {containsAllergens.map(item => (
                      <div
                        key={item.type}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20"
                      >
                        <AllergenBadge type={item.type} size="sm" disableTooltip />
                        <span className="text-sm text-rose-200 font-medium">
                          {ALLERGENS[item.type]?.label || item.type}
                        </span>
                        {item.source === 'manual' && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 uppercase">
                            manual
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* MAY CONTAIN statement */}
            {declaration.mayContain.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                    This recipe may contain
                  </h4>
                </div>
                <div className="pl-4 border-l-2 border-amber-500/30">
                  <div className="flex flex-wrap gap-2">
                    {mayContainAllergens.map(item => (
                      <div
                        key={item.type}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20"
                      >
                        <AllergenBadge type={item.type} size="sm" disableTooltip />
                        <span className="text-sm text-amber-200 font-medium">
                          {ALLERGENS[item.type]?.label || item.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Cross-contact notes */}
            {declaration.crossContactNotes.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  <h4 className="text-xs font-semibold text-orange-400 uppercase tracking-wider">
                    Cross-contact risks
                  </h4>
                </div>
                <div className="pl-4 border-l-2 border-orange-500/30 space-y-1.5">
                  {declaration.crossContactNotes.map((note, idx) => (
                    <p key={idx} className="text-sm text-gray-300">{note}</p>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* ================================================================
       * LEGAL BOUNDARY — Indemnity & Identity
       * ================================================================ */}
      <div className="p-5 border-t border-gray-700 bg-gray-800/30 rounded-b-xl space-y-4">
        
        {/* Declarant identity — UUID + timestamp, no avatar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-mono text-gray-400 truncate" title={userId}>
                {userId}
              </p>
              <p className="text-xs text-gray-500">
                {userRole}{organizationName ? ` · ${organizationName}` : ''}
              </p>
            </div>
          </div>
          
          {/* Declaration timestamp */}
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-gray-500 flex-shrink-0" />
            {hasPreviousDeclaration && !hasUnsavedChanges ? (
              <span className="text-xs text-gray-400">
                Declared {recipe.allergen_declared_at 
                  ? new Date(recipe.allergen_declared_at).toLocaleDateString('en-US', { 
                      year: 'numeric', month: 'short', day: 'numeric',
                      hour: 'numeric', minute: '2-digit'
                    })
                  : 'date unknown'}
              </span>
            ) : hasUnsavedChanges ? (
              <span className="text-xs text-amber-400">Awaiting save</span>
            ) : (
              <span className="text-xs text-gray-500">No declaration on record</span>
            )}
          </div>
        </div>
        
        {/* Confirm Declaration Button */}
        {hasUnsavedChanges && onConfirmDeclaration && (
          <div className="pt-3 border-t border-gray-700/50">
            <button
              type="button"
              onClick={onConfirmDeclaration}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 
                         bg-rose-500/20 hover:bg-rose-500/30 
                         border border-rose-500/40 hover:border-rose-500/60 
                         rounded-xl text-sm font-semibold text-rose-300 
                         transition-all duration-200"
            >
              <FileCheck className="w-4 h-4" />
              Confirm Declaration & Save
            </button>
            <p className="text-[10px] text-gray-500 text-center mt-2">
              By confirming, you accept responsibility for this allergen disclosure
            </p>
          </div>
        )}

        {/* Legal indemnity notice */}
        <div className="pt-3 border-t border-gray-700/50">
          <div className="flex items-start gap-2">
            <Scale className="w-3.5 h-3.5 text-gray-500 mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-gray-500 leading-relaxed">
              <span className="text-gray-400 font-medium">Operator Declaration:</span>{' '}
              By saving this recipe, the above user declares that the allergen 
              information is accurate to the best of their knowledge based on 
              their own ingredient data, supplier disclosures, and professional 
              assessment. ChefLife presents the operator's data as entered — 
              the accuracy and completeness of allergen declarations remains 
              the sole responsibility of the declaring operator and their organization.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
