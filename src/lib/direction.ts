/**
 * +1 in left-to-right layouts, -1 in right-to-left. Multiply a horizontal
 * offset by this so "forward" motion follows the reading direction.
 */
export const inlineSign = () => (document.documentElement.dir === 'rtl' ? -1 : 1)
