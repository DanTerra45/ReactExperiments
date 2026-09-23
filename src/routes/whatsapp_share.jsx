import {
  Bold,
  Check,
  Code2,
  Copy,
  FileUp,
  ImagePlus,
  Italic,
  Link2,
  List,
  MessageCircle,
  Quote,
  Send,
  Share2,
  ShoppingBag,
  Strikethrough,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../lib/cn.js';

const DEFAULT_MESSAGE = `*Novedades ELD*

Tenemos nuevos productos disponibles.

- Stock actualizado
- Entrega en Cochabamba

https://ejemplo.com/catalogo`;

const DETAIL = {
  title: 'Bolso crossbody',
  price: 'Bs 249',
  description: 'Compacto, correa ajustable y cierre metálico.',
  url: 'https://ejemplo.com/productos/bolso-crossbody',
};

const TOOLBAR = [
  { icon: Bold, label: 'Negrita', before: '*', after: '*', placeholder: 'texto' },
  { icon: Italic, label: 'Cursiva', before: '_', after: '_', placeholder: 'texto' },
  { icon: Strikethrough, label: 'Tachado', before: '~', after: '~', placeholder: 'texto' },
  { icon: Code2, label: 'Código', before: '`', after: '`', placeholder: 'texto' },
  { icon: List, label: 'Lista', linePrefix: '- ' },
  { icon: Quote, label: 'Cita', linePrefix: '> ' },
];

function parse_inline(text) {
  const parts = text.split(/(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|`[^`\n]+`)/g);

  return parts.map((part, index) => {
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <strong key={index}>{part.slice(1, -1)}</strong>;
    }

    if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }

    if (part.startsWith('~') && part.endsWith('~') && part.length > 2) {
      return <s key={index}>{part.slice(1, -1)}</s>;
    }

    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={index} className="rounded bg-black/6 px-1 py-0.5 font-mono text-[0.92em] dark:bg-white/10">
          {part.slice(1, -1)}
        </code>
      );
    }

    return part;
  });
}

function MessagePreview({ text }) {
  const lines = text.split('\n');

  return (
    <div className="rounded-2xl bg-[#efeae2] p-5 shadow-inner dark:bg-[#0b141a]">
      <div className="ml-auto max-w-[92%] rounded-xl rounded-tr-sm bg-[#d9fdd3] px-3.5 py-2.5 text-[15px] leading-[1.42] text-zinc-900 shadow-sm dark:bg-[#005c4b] dark:text-[#e9edef]">
        {lines.map((line, index) => {
          const is_list = line.startsWith('- ');
          const is_quote = line.startsWith('> ');
          const content = is_list || is_quote ? line.slice(2) : line;

          return (
            <div
              key={index}
              className={cn(
                'min-h-[1.35em] whitespace-pre-wrap break-words',
                is_quote && 'my-1 border-l-2 border-[#00a884] pl-2',
                is_list && 'relative pl-4',
              )}
            >
              {is_list ? <span className="absolute left-0" aria-hidden="true">•</span> : null}
              {parse_inline(content)}
            </div>
          );
        })}
        <div className="mt-1 text-right text-[11px] leading-none text-zinc-500 dark:text-[#8696a0]">
          17:06 <span className="text-[#53bdeb]">✓✓</span>
        </div>
      </div>
    </div>
  );
}

function copy_text(text, on_done) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(on_done).catch(() => {});
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
  on_done();
}

function sanitize_digits(value) {
  return value.replace(/\D/g, '');
}

function build_whatsapp_url(text, country_code, phone_number) {
  const code = sanitize_digits(country_code);
  const number = sanitize_digits(phone_number);
  const full_number = number ? `${code}${number}` : '';
  const recipient = full_number ? `/${full_number}` : '';

  return `https://wa.me${recipient}?text=${encodeURIComponent(text)}`;
}

function open_whatsapp(text, country_code, phone_number) {
  const url = build_whatsapp_url(text, country_code, phone_number);
  window.open(url, '_blank', 'noopener,noreferrer');
}

function detect_share_capabilities() {
  const secure = window.isSecureContext;
  const share = typeof navigator.share === 'function';
  let files = false;

  if (share && typeof navigator.canShare === 'function') {
    try {
      const probe = new File([''], 'share.png', { type: 'image/png' });
      files = navigator.canShare({ files: [probe] });
    } catch {
      files = false;
    }
  }

  return { secure, share, files };
}

async function share_with_web_api({ title, text, url = '', files = [] }) {
  if (typeof navigator.share !== 'function') {
    throw new Error('Web Share no está disponible en este navegador.');
  }

  if (
    files.length > 0 &&
    typeof navigator.canShare === 'function' &&
    !navigator.canShare({ files })
  ) {
    throw new Error('Este navegador no permite compartir ese archivo.');
  }

  await navigator.share({
    title,
    text,
    ...(url ? { url } : {}),
    ...(files.length > 0 ? { files } : {}),
  });
}

function CapabilityPill({ available, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs',
        available
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
          : 'border-zinc-200 bg-white text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400',
      )}
    >
      {available ? <Check aria-hidden="true" className="size-3" /> : <X aria-hidden="true" className="size-3" />}
      {children}
    </span>
  );
}

function ActionButton({ children, primary = false, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#00a884] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-zinc-950',
        primary
          ? 'bg-[#00a884] text-white hover:bg-[#008f72] disabled:hover:bg-[#00a884]'
          : 'border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:text-zinc-950 disabled:hover:border-zinc-200 disabled:hover:text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:text-white dark:disabled:hover:border-zinc-700 dark:disabled:hover:text-zinc-300',
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export default function WhatsAppShare() {
  const [mode, set_mode] = useState('builder');
  const [message, set_message] = useState(DEFAULT_MESSAGE);
  const [country_code, set_country_code] = useState('');
  const [phone_number, set_phone_number] = useState('');
  const [builder_file, set_builder_file] = useState(null);
  const [detail_image, set_detail_image] = useState(null);
  const [detail_image_url, set_detail_image_url] = useState('');
  const [detail_url, set_detail_url] = useState(DETAIL.url);
  const [share_capabilities, set_share_capabilities] = useState({
    secure: false,
    share: false,
    files: false,
  });
  const [share_error, set_share_error] = useState('');
  const [is_sharing, set_is_sharing] = useState(false);
  const [copied, set_copied] = useState(false);
  const textarea_ref = useRef(null);
  const builder_file_input_ref = useRef(null);
  const detail_image_input_ref = useRef(null);

  const detail_share_text = useMemo(
    () => `*${DETAIL.title}*\n${DETAIL.price}\n\n${DETAIL.description}`,
    [],
  );
  const detail_message = useMemo(
    () => `${detail_share_text}\n\n${detail_url}`,
    [detail_share_text, detail_url],
  );

  useEffect(() => {
    set_share_capabilities(detect_share_capabilities());
  }, []);

  useEffect(() => {
    if (!detail_image) {
      set_detail_image_url('');
      return undefined;
    }

    const url = URL.createObjectURL(detail_image);
    set_detail_image_url(url);

    return () => URL.revokeObjectURL(url);
  }, [detail_image]);

  function mark_copied() {
    set_copied(true);
    window.setTimeout(() => set_copied(false), 1400);
  }

  async function handle_native_share({
    text,
    file = null,
    title = 'WhatsApp share',
    url = '',
  }) {
    set_share_error('');
    set_is_sharing(true);

    try {
      await share_with_web_api({
        title,
        text,
        url,
        files: file ? [file] : [],
      });
    } catch (error) {
      if (error?.name !== 'AbortError') {
        set_share_error(
          error instanceof Error ? error.message : 'No se pudo abrir el menú de compartir.',
        );
      }
    } finally {
      set_is_sharing(false);
    }
  }

  function apply_format(tool) {
    const textarea = textarea_ref.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = message.slice(start, end);

    let replacement;
    let selection_start;
    let selection_end;

    if (tool.linePrefix) {
      const line_start = message.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
      const line_end_index = message.indexOf('\n', end);
      const line_end = line_end_index === -1 ? message.length : line_end_index;
      const block = message.slice(line_start, line_end);
      replacement = block
        .split('\n')
        .map((line) => `${tool.linePrefix}${line}`)
        .join('\n');

      const next = `${message.slice(0, line_start)}${replacement}${message.slice(line_end)}`;
      set_message(next);
      selection_start = line_start;
      selection_end = line_start + replacement.length;
    } else {
      const content = selected || tool.placeholder;
      replacement = `${tool.before}${content}${tool.after}`;
      const next = `${message.slice(0, start)}${replacement}${message.slice(end)}`;
      set_message(next);
      selection_start = start + tool.before.length;
      selection_end = selection_start + content.length;
    }

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(selection_start, selection_end);
    });
  }

  return (
    <main className="min-h-dvh bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8 sm:py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 gap-2 sm:max-w-md">
            <label className="sr-only" htmlFor="whatsapp-country-code">
              Código de país
            </label>
            <div className="relative w-24 shrink-0">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-zinc-400"
              >
                +
              </span>
              <input
                id="whatsapp-country-code"
                type="text"
                inputMode="numeric"
                autoComplete="tel-country-code"
                value={country_code}
                placeholder="591"
                className="min-h-10 w-full rounded-lg border border-zinc-200 bg-white py-2 pl-6 pr-3 text-sm outline-none focus:border-[#00a884] focus:ring-2 focus:ring-[#00a884]/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                onChange={(event) => set_country_code(sanitize_digits(event.target.value))}
              />
            </div>

            <label className="sr-only" htmlFor="whatsapp-phone-number">
              Número de WhatsApp
            </label>
            <input
              id="whatsapp-phone-number"
              type="text"
              inputMode="numeric"
              autoComplete="tel-national"
              value={phone_number}
              placeholder="71234567"
              className="min-h-10 min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#00a884] focus:ring-2 focus:ring-[#00a884]/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              onChange={(event) => set_phone_number(sanitize_digits(event.target.value))}
            />
          </div>

          <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
            <button
              type="button"
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#00a884]',
                mode === 'builder'
                  ? 'bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950'
                  : 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white',
              )}
              onClick={() => set_mode('builder')}
            >
              Generador
            </button>
            <button
              type="button"
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#00a884]',
                mode === 'detail'
                  ? 'bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950'
                  : 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white',
              )}
              onClick={() => set_mode('detail')}
            >
              Detalle
            </button>
          </div>
        </div>

        {mode === 'builder' ? (
          <section className="grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-3 flex flex-wrap gap-1">
                {TOOLBAR.map((tool) => {
                  const Icon = tool.icon;

                  return (
                    <button
                      key={tool.label}
                      type="button"
                      aria-label={tool.label}
                      title={tool.label}
                      className="flex size-9 items-center justify-center rounded-md text-zinc-500 outline-none hover:bg-zinc-100 hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-[#00a884] dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                      onClick={() => apply_format(tool)}
                    >
                      <Icon aria-hidden="true" className="size-4" />
                    </button>
                  );
                })}
              </div>

              <textarea
                ref={textarea_ref}
                value={message}
                aria-label="Mensaje de WhatsApp"
                spellCheck="true"
                className="min-h-72 w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-[15px] leading-6 text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-[#00a884] focus:ring-2 focus:ring-[#00a884]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                onChange={(event) => set_message(event.target.value)}
              />

              <input
                ref={builder_file_input_ref}
                type="file"
                accept="image/*,application/pdf"
                className="sr-only"
                onChange={(event) => {
                  set_builder_file(event.target.files?.[0] ?? null);
                  set_share_error('');
                }}
              />

              <div className="mt-3 flex flex-wrap gap-2">
                <ActionButton onClick={() => copy_text(message, mark_copied)}>
                  {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </ActionButton>
                <ActionButton onClick={() => builder_file_input_ref.current?.click()}>
                  <FileUp aria-hidden="true" className="size-4" />
                  {builder_file ? 'Cambiar archivo' : 'Adjuntar'}
                </ActionButton>
                <ActionButton
                  disabled={is_sharing || !share_capabilities.share}
                  onClick={() =>
                    handle_native_share({
                      text: message,
                      file: builder_file,
                    })
                  }
                >
                  <Share2 aria-hidden="true" className="size-4" />
                  Compartir
                </ActionButton>
                <ActionButton
                  primary
                  onClick={() => open_whatsapp(message, country_code, phone_number)}
                >
                  <Send aria-hidden="true" className="size-4" />
                  Abrir WhatsApp
                </ActionButton>
              </div>

              {builder_file ? (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-800">
                  <span className="min-w-0 truncate text-zinc-600 dark:text-zinc-300">
                    {builder_file.name}
                  </span>
                  <button
                    type="button"
                    aria-label="Quitar archivo"
                    title="Quitar archivo"
                    className="shrink-0 rounded p-1 text-zinc-400 outline-none hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-[#00a884] dark:hover:text-white"
                    onClick={() => {
                      set_builder_file(null);
                      if (builder_file_input_ref.current) {
                        builder_file_input_ref.current.value = '';
                      }
                    }}
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                </div>
              ) : null}
            </div>

            <div>
              <MessagePreview text={message} />
              <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                WhatsApp directo usa texto; Compartir admite archivos si el navegador lo permite.
              </p>
              {share_error && mode === 'builder' ? (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">{share_error}</p>
              ) : null}
            </div>
          </section>
        ) : (
          <section className="grid gap-6 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
            <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <input
                ref={detail_image_input_ref}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  set_detail_image(event.target.files?.[0] ?? null);
                  set_share_error('');
                }}
              />

              <button
                type="button"
                className="group relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden bg-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00a884] dark:bg-zinc-800"
                onClick={() => detail_image_input_ref.current?.click()}
              >
                {detail_image_url ? (
                  <img
                    src={detail_image_url}
                    alt=""
                    className="absolute inset-0 size-full object-cover"
                  />
                ) : (
                  <ShoppingBag aria-hidden="true" className="size-20 text-zinc-300 dark:text-zinc-600" strokeWidth={1.25} />
                )}

                <span className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-lg bg-white/95 px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm backdrop-blur group-hover:bg-white dark:!bg-[#202c33] dark:!text-[#e9edef] dark:group-hover:!bg-[#2a3942]">
                  <ImagePlus aria-hidden="true" className="size-4" />
                  {detail_image ? 'Cambiar imagen' : 'Añadir imagen'}
                </span>
              </button>
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">{DETAIL.title}</h2>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{DETAIL.description}</p>
                  </div>
                  <span className="shrink-0 text-lg font-semibold">{DETAIL.price}</span>
                </div>

                <label className="mt-4 block">
                  <span className="sr-only">URL del producto</span>
                  <span className="relative block">
                    <Link2
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
                    />
                    <input
                      type="url"
                      value={detail_url}
                      placeholder="https://..."
                      className="min-h-10 w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-sm text-zinc-700 outline-none focus:border-[#00a884] focus:ring-2 focus:ring-[#00a884]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
                      onChange={(event) => set_detail_url(event.target.value)}
                    />
                  </span>
                </label>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <ActionButton
                    primary
                    onClick={() =>
                      open_whatsapp(detail_message, country_code, phone_number)
                    }
                  >
                    <MessageCircle aria-hidden="true" className="size-4" />
                    WhatsApp
                  </ActionButton>
                  <ActionButton
                    disabled={is_sharing || !share_capabilities.share}
                    onClick={() =>
                      handle_native_share({
                        title: DETAIL.title,
                        text: detail_share_text,
                        url: detail_url.trim(),
                        file: detail_image,
                      })
                    }
                  >
                    <Share2 aria-hidden="true" className="size-4" />
                    {detail_image ? 'Compartir imagen' : 'Compartir enlace'}
                  </ActionButton>
                </div>
              </div>
            </article>

            <div>
              <MessagePreview text={detail_message} />
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Mensaje generado desde el detalle.
                </p>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 outline-none hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-[#00a884] dark:text-zinc-300 dark:hover:text-white"
                  onClick={() => copy_text(detail_message, mark_copied)}
                >
                  {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
              {share_error && mode === 'detail' ? (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">{share_error}</p>
              ) : null}
            </div>
          </section>
        )}

        <footer className="mt-8 flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <CapabilityPill available={share_capabilities.secure}>Contexto seguro</CapabilityPill>
          <CapabilityPill available={share_capabilities.share}>Web Share</CapabilityPill>
          <CapabilityPill available={share_capabilities.files}>Archivos</CapabilityPill>
        </footer>
      </div>
    </main>
  );
}
