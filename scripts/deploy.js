import { spawn } from 'child_process';
import path from 'path';
import process from 'process';

console.log('Iniciando script de deploy...');

// O erro 'command not found' ocorre porque o shell não sabe onde procurar o executável 'supabase'.
// Esta solução adiciona o diretório de executáveis do node_modules ao PATH do sistema
// apenas para este script, garantindo que o comando seja encontrado.

// Caminho para o diretório .bin dentro de node_modules
const binPath = path.join(process.cwd(), 'node_modules', '.bin');

// Adiciona o caminho ao PATH do ambiente do processo filho
const env = { ...process.env, PATH: `${binPath}:${process.env.PATH}` };

console.log(`Adicionando ao PATH: ${binPath}`);

const child = spawn(
  'supabase', // Agora o sistema deve encontrar o comando
  ['functions', 'deploy', '--project-ref', 'cmrukbrqkjvqeoxueltt'], 
  {
    stdio: 'inherit', // Permite interação com o terminal (para inserir o token)
    shell: true,
    env: env // Passa o ambiente modificado para o processo filho
  }
);

child.on('close', (code) => {
  console.log(`\nScript de deploy finalizado com código ${code}`);
  if (code !== 0) {
    console.error('O deploy falhou. Verifique a saída acima para mais detalhes.');
  } else {
    console.log('Comando de deploy executado com sucesso.');
  }
  process.exit(code);
});

child.on('error', (err) => {
    console.error('Falha ao iniciar o processo de deploy:', err);
    process.exit(1);
});
