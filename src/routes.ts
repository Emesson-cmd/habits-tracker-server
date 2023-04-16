import dayjs from 'dayjs';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from './lib/prisma';

export async function appRoutes(app: FastifyInstance) {
  app.post('/habits', async (request) => {
    const createHabitBody = z.object({
      title: z.string(),
      weekDays: z.array(z.number().min(0).max(6)),
    });

    const { title, weekDays } = createHabitBody.parse(request.body);

    const today = dayjs().startOf('day').toDate();

    await prisma.habit.create({
      data: {
        title,
        created_at: today,
        weekDays: {
          create: weekDays.map((weekDays) => {
            return {
              week_day: weekDays,
            };
          }),
        },
      },
    });
  });

  app.get('/day', async (request) => {
    const getDayParams = z.object({
      date: z.coerce.date(),
    });

    const { date } = getDayParams.parse(request.query);

    const parsedDate = dayjs(date).startOf('day');
    const weekDay = parsedDate.get('day');

    const possibleHabits = await prisma.habit.findMany({
      where: {
        created_at: {
          lte: date,
        },
        weekDays: {
          some: {
            week_day: weekDay,
          },
        },
      },
    });

    const day = await prisma.day.findUnique({
      where: {
        date: parsedDate.toDate(),
      },
      include: {
        dayHabits: true,
      },
    });

    const completedHabits = day?.dayHabits.map((dayHabit) => {
      return dayHabit.habit_id;
    }) ?? [];

    return {
      possibleHabits, // Todos os hábitos que tem para aquela data
      completedHabits, // Todos os hábitos que completei naquela data
    };
  });

  // Serve para completar / descompletar o hábito
  app.patch('/habits/:id/toggle', async (request) => {
    console.log('Chamou');

    // Criar interface para garantir que é um UUID
    const toggleHabitParams = z.object({
      id: z.string().uuid(),
    });

    // Passa o ID da rota no formato da interface
    const { id } = toggleHabitParams.parse(request.params);

    // Pega dia de hoje com horas zeradas para não atrapalhar nos calculos
    const today = dayjs().startOf('day').toDate();

    // Faz busca do dia por data
    let day = await prisma.day.findUnique({
      where: {
        date: today,
      },
    });

    // Se não tiver a data, ela será criada
    if (!day) {
      day = await prisma.day.create({
        data: {
          date: today,
        },
      });
    }

    // Verifica se o usuário já havia marcado o hábito como completo
    const dayHabit = await prisma.dayHabit.findUnique({
      where: {
        day_id_habit_id: {
          day_id: day.id,
          habit_id: id,
        },
      },
    });

    if (dayHabit) {
      // caso haja um registro (está marcado como concluido) será removido
      await prisma.dayHabit.delete({
        where: {
          id: dayHabit.id,
        },
      });
    } else {
      // Cria relação de dia e hábito (no momento que usuário clica em completado)
      await prisma.dayHabit.create({
        data: {
          day_id: day.id,
          habit_id: id,
        },
      });
    }
  });

  // Retorna o resumo de lista com várias informações (data, quanto hábitos possíveis de completar, quantos hábitos completados)
  app.get('/summary', async () => {
    const summary = await prisma.$queryRaw`
      SELECT 
        D.id, 
        D.date,
        (
          SELECT 
            cast(count(*) as float)
          FROM day_habits DH
          WHERE DH.day_id = D.id
        ) as completed,
        (
          SELECT 
            cast(count(*) as float)
          FROM habit_week_days HWD
          JOIN habits H
            ON H.id = HWD.habit_id
          WHERE 
            HWD.week_day = cast(strftime('%w', D.date/1000.0, 'unixepoch') as int)
            AND H.created_at <= D.date
        ) as amount
      FROM days D
    `;

    return summary;
  });
}
