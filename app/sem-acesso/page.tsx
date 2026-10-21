import { sair } from '@/features/acesso/actions';
import { Botao, Cartao, TextoSuave, Titulo } from '@/components/ui';

export default function SemAcesso() {
  return (
    <main style={{ padding: 32, maxWidth: 520 }}>
      <Cartao>
        <Titulo>Sem módulos disponíveis</Titulo>
        <TextoSuave>Seu Perfil não tem acesso a nenhum módulo. Fale com um Administrador.</TextoSuave>
        <form action={sair}>
          <Botao type="submit">Sair</Botao>
        </form>
      </Cartao>
    </main>
  );
}
