import darkTextLogo from '../../assets/brand/logo1.png'
import lightTextLogo from '../../assets/brand/logo.png'

/**
 * Selecciona el recurso oficial adecuado al contraste de la superficie sin alterarlo.
 * @param {object} props Propiedades del logotipo.
 * @param {'dark'|'light'} [props.surface] Superficie sobre la que se presenta el recurso.
 * @param {boolean} [props.compact] Limita el ancho en composiciones reducidas.
 * @returns {import('react').ReactElement} Imagen oficial de MATISTA.
 */
export function BrandLogo({ surface = 'dark', compact = false }) {
  const source = surface === 'light' ? darkTextLogo : lightTextLogo
  const className = compact ? 'brand-logo brand-logo--compact' : 'brand-logo'

  return <img className={className} src={source} alt="MATISTA, Plataforma de Gestión Comercial" />
}
