import { getTeamForUser } from '@/lib/db/queries';
export const GET = async () => {
    const team = await getTeamForUser();
    return Response.json(team);
};
