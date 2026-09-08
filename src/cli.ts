#!/usr/bin/env node
import { getAPOD, getAPODBulk, MAX_BULK_CONCURRENCY, MAX_BULK_DATES } from './index.js';

const HELP = `nasa-apod — Foto Astronômica do Dia da NASA, direto do terminal

Uso:
  nasa-apod [opções]

Opções (data única):
  --key <apiKey>     Chave da API da NASA (padrão: DEMO_KEY, com limite de requisições)
  --date <data>      Data no formato YYYY-MM-DD (padrão: hoje)
  --download         Baixa a imagem/miniatura para o disco
  --path <pasta>     Pasta de destino do download (padrão: ./NASA_IMAGES/)
  --json             Imprime a resposta JSON completa
  -h, --help         Mostra esta mensagem de ajuda

Opções (lote de datas — use --start/--end OU --dates, não os dois):
  --start <data>     Início de um intervalo contínuo (usado com --end); 1 única requisição à API
  --end <data>       Fim do intervalo (padrão: hoje)
  --dates <lista>    Datas específicas separadas por vírgula, ex.: 2024-01-01,2023-05-05
  --max <n>          Limite de datas no lote (padrão/teto: ${MAX_BULK_DATES})
  --concurrency <n>  Requisições em paralelo ao usar --dates (padrão/teto: ${MAX_BULK_CONCURRENCY})

Exemplos:
  nasa-apod
  nasa-apod --date 2024-01-01
  nasa-apod --download --path ./fotos
  nasa-apod --start 2024-01-01 --end 2024-01-07 --json
  nasa-apod --dates 2024-01-01,2023-05-05,2022-12-25 --json
`;

interface CliOptions {
  apiKey?: string;
  date?: string;
  download?: boolean;
  downloadPath?: string;
  start?: string;
  end?: string;
  dates?: string;
  max?: number;
  concurrency?: number;
}

function parseArgs(argv: string[]): { opts: CliOptions; json: boolean } {
  const opts: CliOptions = {};
  let json = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '-h':
      case '--help':
        process.stdout.write(HELP);
        process.exit(0);
        break;
      case '--key':
        opts.apiKey = argv[++i];
        break;
      case '--date':
        opts.date = argv[++i];
        break;
      case '--download':
        opts.download = true;
        break;
      case '--path':
        opts.downloadPath = argv[++i];
        break;
      case '--start':
        opts.start = argv[++i];
        break;
      case '--end':
        opts.end = argv[++i];
        break;
      case '--dates':
        opts.dates = argv[++i];
        break;
      case '--max':
        opts.max = Number(argv[++i]);
        break;
      case '--concurrency':
        opts.concurrency = Number(argv[++i]);
        break;
      case '--json':
        json = true;
        break;
      default:
        break;
    }
  }

  return { opts, json };
}

async function runBulk(opts: CliOptions, json: boolean): Promise<void> {
  const dates = opts.dates
    ? opts.dates
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean)
    : undefined;

  const result = await getAPODBulk({
    apiKey: opts.apiKey,
    startDate: opts.start,
    endDate: opts.end,
    dates,
    maxDates: Number.isFinite(opts.max) ? opts.max : undefined,
    concurrency: Number.isFinite(opts.concurrency) ? opts.concurrency : undefined,
  });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (result.truncated) {
    console.error(`Aviso: o lote pedido era maior que o limite e foi cortado para ${result.requested} data(s).`);
  }

  for (const item of result.results) {
    if (item.response.error) {
      console.log(`${item.date}: ERRO — ${item.response.error_msg || item.response.dev_msg}`);
      if (item.response.fallback && item.response.nasa.title) {
        console.log(`  (exemplo em vez disso: ${item.response.nasa.title} — ${item.response.best_image})`);
      }
    } else {
      console.log(`${item.date}: ${item.response.nasa.title} — ${item.response.best_image}`);
    }
  }

  console.log(`\n${result.requested} data(s) pedida(s), ${result.failed} com erro.`);
  if (result.failed > 0) process.exitCode = 1;
}

async function main(): Promise<void> {
  const [, , ...argv] = process.argv;
  const { opts, json } = parseArgs(argv);

  if (opts.start || opts.end || opts.dates) {
    await runBulk(opts, json);
    return;
  }

  const result = await getAPOD({
    apiKey: opts.apiKey,
    date: opts.date,
    download: opts.download,
    downloadPath: opts.downloadPath,
  });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (result.error) {
    console.error(`Erro: ${result.error_msg || result.dev_msg}`);
    process.exitCode = 1;

    // Mesmo com erro, a resposta traz uma foto de exemplo utilizável (ver
    // `fallback` no JSON) — exibida aqui para não deixar o usuário do CLI
    // sem nada em mãos quando a API da NASA falha.
    if (result.fallback && result.nasa.title) {
      console.error(`\nExibindo um exemplo em vez disso: ${result.nasa.title} (${result.nasa.date})`);
      console.error(`Imagem: ${result.best_image}`);
    }
    return;
  }

  console.log(`${result.nasa.title} (${result.nasa.date})`);
  console.log(result.nasa.explanation);
  console.log(`\nImagem: ${result.best_image}`);
  if (result.download) console.log(`Download: ${result.download}`);
}

main().catch((err) => {
  console.error('[nasa-apod] erro fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
