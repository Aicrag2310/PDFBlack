import React from 'react'
import { Link } from 'react-router-dom'
import {
  FileText, Edit3, Scissors, Merge, ScanLine, Zap,
  Lock, Globe, ChevronRight, Check, X, Github,
  Image, PenTool, RotateCcw, FileDown,
  Eye, Droplets, FileSearch
} from 'lucide-react'
import Navbar from '../components/layout/Navbar.jsx'
import styles from './Landing.module.css'

const FEATURES = [
  {
    icon: Edit3,
    label: 'Editar texto existente',
    desc: 'Haz clic sobre cualquier texto de un PDF y edítalo directamente. Cambia tamaño, color o fuente.',
    tag: 'Función principal'
  },
  {
    icon: ScanLine,
    label: 'Escáner OCR',
    desc: 'Convierte documentos escaneados e imágenes en texto que puedes buscar y editar.',
    tag: 'Inteligente'
  },
  {
    icon: Merge,
    label: 'Unir PDFs',
    desc: 'Arrastra y combina varios archivos PDF controlando el orden de cada página.'
  },
  {
    icon: Scissors,
    label: 'Dividir PDF',
    desc: 'Divide documentos por rangos de páginas o extrae páginas individuales.'
  },
  {
    icon: Image,
    label: 'Editar imágenes',
    desc: 'Agrega, elimina, reemplaza o mueve imágenes dentro de un documento PDF.'
  },
  {
    icon: PenTool,
    label: 'Firmar documentos',
    desc: 'Dibuja, escribe o carga tu firma y colócala directamente en cualquier página.'
  },
  {
    icon: FileDown,
    label: 'Comprimir PDF',
    desc: 'Reduce el tamaño de tus archivos PDF para facilitar su almacenamiento y envío.'
  },
  {
    icon: RotateCcw,
    label: 'Rotar y ordenar',
    desc: 'Gira páginas individualmente y cambia su orden fácilmente.'
  },
  {
    icon: Lock,
    label: 'Proteger con contraseña',
    desc: 'Protege tus documentos PDF con contraseña y evita accesos no autorizados.'
  },
  {
    icon: Eye,
    label: 'Ocultar información',
    desc: 'Oculta permanentemente información sensible dentro de tus documentos.'
  },
  {
    icon: Droplets,
    label: 'Marca de agua',
    desc: 'Agrega marcas de agua de texto o imágenes con control de posición y transparencia.'
  },
  {
    icon: FileSearch,
    label: 'Completar formularios',
    desc: 'Rellena, guarda y exporta formularios PDF de manera sencilla.'
  },
]

const COMPARE = [
  { feature: 'Editar texto existente', df: true, others: 'Frecuentemente de pago o limitado' },
  { feature: 'Archivos sin límite de tamaño', df: true, others: 'Frecuentemente limitado' },
  { feature: 'Uso sin límites diarios', df: true, others: 'Los planes gratuitos pueden tener límites' },
  { feature: 'Funciona sin conexión', df: true, others: 'Generalmente depende de servicios en línea' },
  { feature: 'Sin crear una cuenta', df: true, others: 'Algunos servicios lo requieren' },
  { feature: 'Los archivos permanecen en tu dispositivo', df: true, others: 'No siempre' },
  { feature: 'OCR', df: true, others: 'Frecuentemente de pago' },
  { feature: 'Firma de documentos', df: true, others: 'Frecuentemente de pago' },
  { feature: 'Código abierto', df: true, others: 'Poco común' },
  { feature: 'Gratuito', df: true, others: 'Los planes gratuitos suelen tener límites' },
]

function Cell({ val }) {
  if (val === true) return <span className={styles.yes}><Check size={14} /></span>
  if (val === false) return <span className={styles.no}><X size={14} /></span>
  return <span className={styles.partial}>{val}</span>
}

export default function Landing() {
  return (
    <div className={styles.page}>
      <Navbar variant="landing" />

      <section className={styles.hero}>
        <div className={styles.heroInner}>

          <div className={styles.heroEyebrow}>
            <Globe size={12} /> Código abierto · Gratuito · Sin servidores
          </div>

          <h1 className={styles.heroTitle}>
            Tu editor de PDF<br />
            <span className={styles.heroAccent}>
              rápido, sencillo y gratuito
            </span>
          </h1>

          <p className={styles.heroSub}>
            Edita, convierte, firma y organiza tus documentos PDF sin complicaciones.
            <em>
              {' '}Aicrag PDF te ofrece las herramientas que necesitas para trabajar con
              tus archivos de forma sencilla y segura.
            </em>
            {' '}Tus archivos permanecen en tu dispositivo.
          </p>

          <div className={styles.heroActions}>
            <Link to="/editor" className={styles.primaryBtn}>
              <Zap size={16} />
              Comenzar a editar
              <ChevronRight size={14} />
            </Link>

            <a
              href="https://github.com/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.ghostBtn}
            >
              <Github size={15} />
              Ver proyecto
            </a>
          </div>

          <div className={styles.heroPills}>
            <span className={styles.pill}>
              <Check size={11} /> Sin registro
            </span>

            <span className={styles.pill}>
              <Check size={11} /> Sin límites innecesarios
            </span>

            <span className={styles.pill}>
              <Check size={11} /> Fácil de usar
            </span>

            <span className={styles.pill}>
              <Check size={11} /> Funciona sin conexión
            </span>

            <span className={styles.pillAccent}>
              <Lock size={11} /> Tus archivos son privados
            </span>
          </div>

        </div>

        <div className={styles.heroVisual}>
          <div className={styles.editorPreview}>

            <div className={styles.previewBar}>
              <div className={styles.previewDots}>
                <span /><span /><span />
              </div>

              <span className={styles.previewTitle}>
                constancia.pdf - Aicrag PDF
              </span>
            </div>

            <div className={styles.previewContent}>

              <div className={styles.previewToolbar}>
                {['T', 'B', 'I', '|', '12', '|', 'Helvetica'].map((t, i) => (
                  <span
                    key={i}
                    className={t === '|' ? styles.sep : styles.tbItem}
                  >
                    {t}
                  </span>
                ))}
              </div>

              <div className={styles.previewPage}>

                <div className={styles.previewSelectedBlock}>
                  Constancia de participación
                  <div className={styles.selHandle} />
                </div>

                <div
                  className={styles.previewTextLine}
                  style={{ width: '90%', marginTop: 28 }}
                />

                <div
                  className={styles.previewTextLine}
                  style={{ width: '75%', marginTop: 8 }}
                />

                <div
                  className={styles.previewTextLine}
                  style={{ width: '82%', marginTop: 8 }}
                />

                <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>

                  <div
                    className={styles.previewCard}
                    style={{ background: 'rgba(59,130,246,0.15)' }}
                  >
                    <span style={{ fontSize: 10, color: '#60a5fa' }}>
                      Documento
                    </span>

                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 600,
                        color: '#93c5fd'
                      }}
                    >
                      PDF
                    </span>
                  </div>

                  <div
                    className={styles.previewCard}
                    style={{ background: 'rgba(16,185,129,0.15)' }}
                  >
                    <span style={{ fontSize: 10, color: '#34d399' }}>
                      Estado
                    </span>

                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 600,
                        color: '#6ee7b7'
                      }}
                    >
                      Listo
                    </span>
                  </div>

                </div>

                <div className={styles.previewCtx}>
                  <span>Negrita</span>
                  <span>Cursiva</span>
                  <span>Imagen</span>
                  <span>Enlace</span>
                  <span style={{ color: '#e84545' }}>Eliminar</span>
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionInner}>

          <div className={styles.sectionLabel}>
            Todo lo que necesitas
          </div>

          <h2 className={styles.sectionTitle}>
            Todas las herramientas en un solo lugar.
          </h2>

          <p className={styles.sectionSub}>
            Las herramientas principales para trabajar con tus documentos PDF
            de manera rápida y sencilla.
          </p>

          <div className={styles.featureGrid}>
            {FEATURES.map((f) => {
              const Icon = f.icon

              return (
                <div key={f.label} className={styles.featureCard}>

                  <div className={styles.featureIconWrap}>
                    <Icon size={20} />
                  </div>

                  <div className={styles.featureLabel}>
                    {f.label}

                    {f.tag && (
                      <span className={styles.featureTag}>
                        {f.tag}
                      </span>
                    )}
                  </div>

                  <div className={styles.featureDesc}>
                    {f.desc}
                  </div>

                </div>
              )
            })}
          </div>

        </div>
      </section>

      <section
        className={styles.section}
        style={{ background: 'var(--bg-nav)' }}
      >
        <div className={styles.sectionInner}>

          <div className={styles.sectionLabel}>
            Comparación
          </div>

          <h2 className={styles.sectionTitle}>
            Aicrag PDF frente a otras herramientas
          </h2>

          <div className={styles.tableWrap}>

            <table className={styles.compareTable}>

              <thead>
                <tr>
                  <th>Característica</th>

                  <th className={styles.thDocforge}>
                    <div className={styles.thBadge}>
                      Aicrag PDF
                    </div>

                    <div className={styles.thPrice}>
                      Gratuito
                    </div>
                  </th>

                  <th>
                    <div>Otras herramientas</div>

                    <div className={styles.thPrice}>
                      Frecuentemente de pago o con limitaciones
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody>
                {COMPARE.map((row) => (
                  <tr key={row.feature}>
                    <td>{row.feature}</td>

                    <td className={styles.tdDocforge}>
                      <Cell val={row.df} />
                    </td>

                    <td>
                      <Cell val={row.others} />
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionInner}>

          <div className={styles.sectionLabel}>
            Privacidad primero
          </div>

          <h2 className={styles.sectionTitle}>
            Tus archivos permanecen en tu dispositivo
          </h2>

          <div className={styles.howGrid}>

            <div className={styles.howCard}>
              <div className={styles.howNum}>01</div>

              <div className={styles.howTitle}>
                Abre tu PDF
              </div>

              <div className={styles.howDesc}>
                Arrastra tu documento o selecciónalo desde tu computadora.
                El archivo se carga directamente en tu dispositivo.
              </div>
            </div>

            <div className={styles.howCard}>
              <div className={styles.howNum}>02</div>

              <div className={styles.howTitle}>
                Edita tu documento
              </div>

              <div className={styles.howDesc}>
                Utiliza las herramientas de Aicrag PDF para editar, organizar,
                firmar y modificar tu documento.
              </div>
            </div>

            <div className={styles.howCard}>
              <div className={styles.howNum}>03</div>

              <div className={styles.howTitle}>
                Guarda tu PDF
              </div>

              <div className={styles.howDesc}>
                Genera tu documento final y guárdalo directamente en tu
                computadora, sin necesidad de subirlo a un servidor.
              </div>
            </div>

          </div>
        </div>
      </section>

      <section className={styles.ctaSection}>
        <div className={styles.ctaInner}>

          <h2 className={styles.ctaTitle}>
            ¿Listo para trabajar con tus PDFs?
          </h2>

          <p className={styles.ctaSub}>
            Sin registros complicados. Sin servidores. Abre un PDF y comienza
            a trabajar.
          </p>

          <div className={styles.ctaActions}>

            <Link
              to="/editor"
              className={styles.primaryBtn}
              style={{
                fontSize: 15,
                padding: '12px 28px'
              }}
            >
              <Zap size={16} />
              Abrir editor
            </Link>

            <Link
              to="/tools"
              className={styles.ghostBtn}
            >
              Ver herramientas
              <ChevronRight size={14} />
            </Link>

          </div>

        </div>
      </section>

      <footer className={styles.footer}>

        <div className={styles.footerInner}>

          <div className={styles.footerLogo}>

            <div className={styles.footerLogoMark}>
              <FileText size={14} />
            </div>

            <span>
              Aicrag PDF
            </span>

          </div>

          <div className={styles.footerLinks}>

            <a
              href="https://github.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>

            <Link to="/tools">
              Herramientas
            </Link>

            <Link to="/editor">
              Editor
            </Link>

            <a
              href="https://github.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Reportar problema
            </a>

          </div>

          <div className={styles.footerNote}>
            Aicrag PDF · Código abierto · Construido con pdf-lib, PDF.js y
            Tesseract.js · Sin rastreo
          </div>

        </div>

      </footer>

    </div>
  )
}