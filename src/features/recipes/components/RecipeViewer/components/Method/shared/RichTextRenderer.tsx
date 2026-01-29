/**
 * RichTextRenderer - Converts TipTap HTML to styled React components
 */

import React from 'react';
import { Check, Info } from 'lucide-react';
import type { InstructionBlockTemplate } from '@/features/recipes/hooks/useRecipeConfig';
import { CALLOUT_ICONS, CALLOUT_COLORS } from './constants';

interface RichTextRendererProps {
  html: string;
  blocks: InstructionBlockTemplate[];
  size?: 'normal' | 'large' | 'guided';
  subtle?: boolean;
}

export const RichTextRenderer: React.FC<RichTextRendererProps> = ({ 
  html, 
  blocks, 
  size = 'normal', 
  subtle = false 
}) => {
  if (!html || html === '<p></p>') {
    return <span className="text-gray-500 italic">No instructions</span>;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const renderNode = (node: Node, key: number): React.ReactNode => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (node.nodeType !== Node.ELEMENT_NODE) return null;

    const element = node as Element;
    const tagName = element.tagName.toLowerCase();
    const children = Array.from(element.childNodes).map((child, i) => renderNode(child, i));

    const textSize = size === 'guided' 
      ? 'text-base sm:text-lg' 
      : size === 'large' 
        ? 'text-lg sm:text-xl lg:text-2xl' 
        : 'text-sm';
    
    const textColor = subtle ? 'text-neutral-300' : 'text-gray-300';

    switch (tagName) {
      case 'p':
        return <p key={key} className={`${textSize} ${textColor} leading-relaxed mb-3 last:mb-0`}>{children}</p>;
      case 'h2':
        return <h2 key={key} className={`${size === 'guided' ? 'text-lg sm:text-xl' : 'text-base'} font-semibold ${subtle ? 'text-neutral-100' : 'text-white'} mt-4 mb-2`}>{children}</h2>;
      case 'h3':
        return <h3 key={key} className={`${size === 'guided' ? 'text-base' : 'text-sm'} font-medium ${subtle ? 'text-neutral-200' : 'text-white'} mt-3 mb-1.5`}>{children}</h3>;
      case 'strong':
      case 'b':
        return <strong key={key} className={`font-semibold ${subtle ? 'text-neutral-100' : 'text-white'}`}>{children}</strong>;
      case 'em':
      case 'i':
        return <em key={key} className={`italic ${subtle ? 'text-neutral-200' : 'text-gray-200'}`}>{children}</em>;
      case 'u':
        return <u key={key} className={`underline ${subtle ? 'decoration-neutral-600' : 'decoration-amber-500/60'} decoration-2 underline-offset-2`}>{children}</u>;
      case 's':
      case 'strike':
        return <s key={key} className="line-through text-gray-500">{children}</s>;
      case 'mark':
        return <mark key={key} className={`${subtle ? 'bg-neutral-700/50 text-neutral-100' : 'bg-amber-500/30 text-amber-100'} px-1 rounded`}>{children}</mark>;
      case 'ul':
        return <ul key={key} className={`${textSize} list-none space-y-1.5 my-3 ml-1`}>{children}</ul>;
      case 'ol':
        return <ol key={key} className={`${textSize} list-none space-y-1.5 my-3 ml-1`}>{children}</ol>;
      case 'li':
        const isTask = element.getAttribute('data-type') === 'taskItem';
        const isChecked = element.getAttribute('data-checked') === 'true';
        
        if (isTask) {
          return (
            <li key={key} className={`flex items-start gap-2.5 ${isChecked ? 'opacity-60' : ''}`}>
              <span className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${isChecked ? 'bg-emerald-500/30 border-emerald-500 text-emerald-400' : subtle ? 'border-neutral-600' : 'border-gray-500'}`}>
                {isChecked && <Check className="w-2.5 h-2.5" />}
              </span>
              <span className={isChecked ? 'line-through text-gray-500' : textColor}>{children}</span>
            </li>
          );
        }
        
        const parentTag = element.parentElement?.tagName.toLowerCase();
        if (parentTag === 'ol') {
          return (
            <li key={key} className={`flex items-start gap-2.5 ${textColor}`}>
              <span className={`w-5 h-5 rounded-full ${subtle ? 'bg-neutral-800 text-neutral-500' : 'bg-gray-700/60 text-gray-400'} text-xs font-medium flex items-center justify-center flex-shrink-0 mt-0.5`}>{key + 1}</span>
              <span>{children}</span>
            </li>
          );
        }
        
        return (
          <li key={key} className={`flex items-start gap-2.5 ${textColor}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${subtle ? 'bg-neutral-600' : 'bg-amber-500/60'} flex-shrink-0 mt-2`} />
            <span>{children}</span>
          </li>
        );
      case 'blockquote':
        return <blockquote key={key} className={`border-l-3 ${subtle ? 'border-neutral-700 text-neutral-400' : 'border-amber-500/40 text-gray-400'} pl-3 my-3 italic`}>{children}</blockquote>;
      case 'hr':
        return <hr key={key} className={subtle ? 'border-neutral-800' : 'border-gray-700'} />;
      case 'div':
        if (element.hasAttribute('data-callout')) {
          const calloutType = element.getAttribute('data-callout-type') || 'info';
          const blockConfig = blocks.find(b => b.type === calloutType);
          const colorConfig = CALLOUT_COLORS[blockConfig?.color || 'blue'] || CALLOUT_COLORS.blue;
          const IconComponent = CALLOUT_ICONS[blockConfig?.icon || 'Info'] || Info;
          const label = blockConfig?.label || calloutType;

          if (subtle) {
            return (
              <div key={key} className="relative my-4 pl-4 border-l-2 border-neutral-700">
                <div className="text-xs font-medium uppercase tracking-wider mb-1 text-neutral-500">{label}</div>
                <div className="text-sm sm:text-base text-neutral-400 leading-relaxed">{children}</div>
              </div>
            );
          }

          return (
            <div key={key} className={`rounded-lg border-l-4 p-3 my-3 ${colorConfig.bg} ${colorConfig.border}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`w-5 h-5 rounded flex items-center justify-center ${colorConfig.icon}`} style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                  <IconComponent className="w-3 h-3" />
                </div>
                <span className={`text-xs font-bold uppercase tracking-wider ${colorConfig.icon}`}>{label}</span>
              </div>
              <div className={`${size === 'large' ? 'text-base sm:text-lg' : 'text-sm'} ${colorConfig.text} leading-relaxed`}>{children}</div>
            </div>
          );
        }
        return <div key={key}>{children}</div>;
      default:
        return <span key={key}>{children}</span>;
    }
  };

  return <div className="rich-text-content">{Array.from(doc.body.childNodes).map((node, i) => renderNode(node, i))}</div>;
};

export default RichTextRenderer;
