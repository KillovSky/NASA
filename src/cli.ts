#!/usr/bin/env node
import { getAPOD } from './index.js';

const HELP = `nasa-apod — Foto Astronômica do Dia da NASA, direto do terminal

Uso:
  nasa-apod [opções]

Opções:
  --key <apiKey>     Chave da API da NASA (padrão: DEMO_KEY, com limite de requisições)
  --date <data>      Data no formato YYYY-MM-DD (padrão: hoje)
  --download         Baixa a imagem/miniatura para o disco
  --path <pasta>     Pasta de destino do download (padrão: ./NASA_IMAGES/)
  --json             Imprime a resposta JSON completa
  -h, --help         Mostra esta mensagem de ajuda

Exemplos:
  nasa-apod
  nasa-apod --date 2024-01-01
  nasa-apod --download --path ./fotos
`;

async function main(): Promise<void> {
  const [, , ...argv] = process.argv;

  const opts: { apiKey?: string; date?: string; download?: boolean; downloadPath?: string } = {};
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
      case '--json':
        json = true;
        break;
      default:
        break;
    }
  }

  const result = await getAPOD(opts);

  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (result.error) {
    console.error(`Erro: ${result.error_msg || result.dev_msg}`);
    process.exitCode = 1;
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
