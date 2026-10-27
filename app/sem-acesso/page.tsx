import { sair } from '@/features/acesso/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function SemAcesso() {
  return (
    <main className="p-8 max-w-md">
      <Card>
        <CardContent className="pt-5 flex flex-col gap-4">
          <h1 className="text-lg font-bold text-[var(--texto-forte)] m-0">Sem módulos disponíveis</h1>
          <p className="text-sm text-[var(--texto-suave)] m-0">
            Seu Perfil não tem acesso a nenhum módulo. Fale com um Administrador.
          </p>
          <form action={sair}>
            <Button type="submit" variant="outline">Sair</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
