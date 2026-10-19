import { authenticateDemoFixture } from './demo-session';

/** A signed-in ordinary creator with both fixture zones; evaluation uses a separate leader. */
export async function configureRedTagMemberFixture() {
 authenticateDemoFixture();
 const identity=await import('@/lib/current-user');
 const directory=await import('@/features/five-s/administration/store');
 const member=directory.getAdminUser(identity.DEMO_USERS.responsible.id)!;
 if(!member.zoneMemberships.some(item=>item.zone==='Zone A')) member.zoneMemberships.push({zone:'Zone A',responsibility:'Member'});
 window.localStorage.setItem('five-s-administration-users-v1',JSON.stringify(directory.getAdminUsers()));
 identity.setDemoRole('responsible');
 return identity;
}
