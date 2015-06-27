import com.badlogic.gdx.Gdx
import com.badlogic.gdx.audio.Sound
import com.badlogic.gdx.math.Vector2
import com.brm.GoatEngine.ECS.common.ParticleEffectComponent
import com.brm.GoatEngine.ECS.common.PhysicsComponent
import com.brm.GoatEngine.ECS.common.SpriterAnimationComponent
import com.brm.GoatEngine.ECS.core.Entity
import com.brm.GoatEngine.ECS.core.EntityManager
import com.brm.GoatEngine.EventManager.EntityEvent
import com.brm.GoatEngine.Input.VirtualGamePad
import com.brm.GoatEngine.ScriptingEngine.EntityScript
import com.brm.GoatEngine.Utils.Math.GameMath
import com.brm.Kubotz.Common.Events.DamageTakenEvent
import com.brm.Kubotz.Common.Events.StunnedFinishedEvent
import com.brm.Kubotz.Constants
import com.brm.Kubotz.Features.DashBoots.Events.DashPhaseChangeEvent
import com.brm.Kubotz.Features.GameRules.Events.PlayerDeadEvent
import com.brm.Kubotz.Features.KubotzCharacter.Components.BigBuffHeadComponent
import com.brm.Kubotz.Features.KubotzCharacter.Components.SkullHeadComponent
import com.brm.Kubotz.Features.KubotzCharacter.Components.TerminatorHeadComponent
import com.brm.Kubotz.Features.LaserGuns.Components.GunComponent
import com.brm.Kubotz.Features.LaserGuns.Events.FinishGunShotEvent
import com.brm.Kubotz.Features.LaserGuns.Events.GunShotEvent
import com.brm.Kubotz.Features.LaserSword.Components.LaserSwordComponent
import com.brm.Kubotz.Features.LaserSword.Events.FinishSwordSwingEvent
import com.brm.Kubotz.Features.LaserSword.Events.SwordSwingEvent
import com.brm.Kubotz.Features.MeleeAttacks.Events.FinishPunchEvent
import com.brm.Kubotz.Features.MeleeAttacks.Events.PunchEvent
import com.brm.Kubotz.Input.GameButton
/**
 * Updates a kubotz Sprite according to animation and movement
 * It is an animation Controller
 */
public class KubotzAnimationScript extends EntityScript {

    public static final String IDLE = "Idle";
    public static final String RUNNING = "Running";
    public static final String JUMPING = "Jumping";
    public static final String FALLING = "Falling";
    public static final String PUNCHING = "Punching";
    public static final String AIR_KICKING = "Air Kicking";
    public static final String KICKING = "Kicking";


    public static final String SHOOTING = "Shooting";
    public static final String SWORD_SLASH = "Sword_slash1";

    public static final String HURT = "Hit";

    public static final String DYING = "Dying";

    public static final String DASH_BEGIN = "Dash_begin";
    public static final String DASH_DASHIN = "Dash_dashin";







    public static final int CHAR_MAP_HEAD_ID = 0;
    public static final int CHAR_MAP_ARM_ID = 0;
    public static final int CHAR_MAP_BOOTS_ID = 0;



    public static final String DEFAULT = KubotzAnimationScript.IDLE;

    //Default state
    private String currentState = KubotzAnimationScript.DEFAULT;


    @Override
    public <T extends EntityEvent> void onEvent(T event, Entity entity) {


        //GunShot
        if(event.getClass() == GunShotEvent.class){
            onGunShot((GunShotEvent) event);
            return;
        }
        if(event.getClass() == FinishGunShotEvent.class){
            currentState = KubotzAnimationScript.DEFAULT;
            return;
        }

        //SwordSwing
        if(event.getClass() == SwordSwingEvent.class){
            onSwordSwing((SwordSwingEvent) event);
            return;
        }
        if(event.getClass() == FinishSwordSwingEvent.class){
            currentState = KubotzAnimationScript.DEFAULT;
            return;
        }

        //Punches
        if(event.getClass() == PunchEvent.class){
            onPunch((PunchEvent) event);
            return;
        }
        if(event.getClass() == FinishPunchEvent.class){
            currentState = KubotzAnimationScript.DEFAULT;
            return;
        }

        //STUNNED HIT HURT
        if(event.getClass() == DamageTakenEvent.class){
            onDamageTaken((DamageTakenEvent) event);
            return;
        }
        if(event.getClass() == StunnedFinishedEvent.class){
            currentState = KubotzAnimationScript.DEFAULT;
        }



        // DEAD
        if(event.getClass() == PlayerDeadEvent.class){
            onPlayerDead((PlayerDeadEvent) event, entity);
        }


        //DASH
        if(event.getClass() == DashPhaseChangeEvent.class){
            onDash((DashPhaseChangeEvent)event, entity);
        }








    }



    @Override
    public void onUpdate(Entity entity, EntityManager entityManager) {
        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
        SpriterAnimationComponent anim = (SpriterAnimationComponent)entity.getComponent(SpriterAnimationComponent.ID);
        VirtualGamePad gamePad = (VirtualGamePad)entity.getComponent(VirtualGamePad.ID);


        handleRunning(entity, phys, gamePad, anim);




        this.handleCharacterMaps(entity, anim);
        anim.setAnimation(currentState);
        if(!currentState.equals(KubotzAnimationScript.JUMPING)) {
            handleFlip(phys, anim);
        }


        if(currentState.equals(KubotzAnimationScript.HURT)){
            //createSwordTrail(entity);
            createHurtParticles(entity, phys);
        }


        if(currentState.equals(KubotzAnimationScript.RUNNING)){
            int currentTime = anim.getPlayer().getTime();
            if(GameMath.isMoreOrLess(currentTime, 300, 10) || GameMath.isMoreOrLess(currentTime, 800, 10)){
                Sound sound = Gdx.audio.newSound(Gdx.files.internal("audio/step.mp3"));
                sound.play();
            }
        }





    }








    /**
     * Called when the entity shoots a gun
     * @param e the event
     */
    private void onGunShot(GunShotEvent e){
        currentState = KubotzAnimationScript.SHOOTING;
    }

    /**
     * Called when the entity swings a sword
     * @param e the event
     */
    private void onSwordSwing(SwordSwingEvent e){
        currentState = KubotzAnimationScript.SWORD_SLASH;
    }

    /**
     * Called when an entity punches
     * @param e
     */
    private void onPunch(PunchEvent e){
        currentState = KubotzAnimationScript.AIR_KICKING;
    }


    /**
     * Called when the entity takes some damage
     * @param e
     */
    private void onDamageTaken(DamageTakenEvent e){
        currentState = KubotzAnimationScript.HURT;
    }

    /**
     * Called when the player dies
     * @param e
     * @param entity
     */
    private void onPlayerDead(PlayerDeadEvent e, Entity entity){
        SpriterAnimationComponent anim = (SpriterAnimationComponent) entity.getComponent(SpriterAnimationComponent.ID);
        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
        anim.setAnimation(KubotzAnimationScript.DYING);
        // TODO dying Particle Effect set object alpha to 0
        ParticleEffectComponent pe = (ParticleEffectComponent) entity.getComponent(ParticleEffectComponent.ID);
        Vector2 pos = phys.getPosition().cpy();
        pos.y -= phys.getHeight()/2;
        pe.addEffect(Gdx.files.internal("particles/deathDust.pe"), pos, true);
    }


    /**
     * Called when there is a change in the dash comp
     * @param e
     * @param entity
     */
    private void onDash(DashPhaseChangeEvent e, Entity entity) {
        SpriterAnimationComponent anim = (SpriterAnimationComponent) entity.getComponent(SpriterAnimationComponent.ID);
        switch (e.getPhase()) {
            case PREPARATION:
                currentState = KubotzAnimationScript.DASH_BEGIN;
                break;
            case TRAVEL:
                currentState = KubotzAnimationScript.DASH_DASHIN;
                break;

            case DONE:
                currentState = KubotzAnimationScript.DEFAULT;
                break;
        }
    }






    /**
     * Flips the Sprite to the side the character is looking at
     * @param phys
     * @param anim
     */
    private void handleFlip(PhysicsComponent phys, SpriterAnimationComponent anim){
        //Handle Flip
        if(phys.getDirection() == PhysicsComponent.Direction.RIGHT){
            if(!anim.getPlayer().isFlippedX()){
                anim.getPlayer().flipX();
            }
        }else{
            if(anim.getPlayer().isFlippedX()){
                anim.getPlayer().flipX();
            }
        }
    }


    /**
     * Handles animation when entity is moving on foot (running, Jumping, Falling, Idle etc.)
     * @param entity
     * @param phys
     * @param gamePad
     * @param anim
     */
    private void handleRunning(Entity entity, PhysicsComponent phys, VirtualGamePad gamePad, SpriterAnimationComponent anim){
        //Check states
        if(currentState.equals(KubotzAnimationScript.IDLE)){
            if(gamePad.isButtonPressed(GameButton.DPAD_LEFT) || gamePad.isButtonPressed(GameButton.DPAD_RIGHT)) {
                currentState = "Running";
            }

            if(phys.getVelocity().y > 0){
                if(gamePad.isButtonPressed(GameButton.DPAD_UP)) {
                    currentState = KubotzAnimationScript.JUMPING;
                }
            }

            if(!phys.isGrounded() && phys.getVelocity().y < 0){
                currentState = KubotzAnimationScript.FALLING;
            }

        }else if(currentState.equals(KubotzAnimationScript.RUNNING)){
            if(phys.getVelocity().y > 0){
                if(gamePad.isButtonPressed(GameButton.DPAD_UP)) {
                    currentState = KubotzAnimationScript.JUMPING;
                }
            }
            if(!phys.isGrounded() && phys.getVelocity().y < 0){
                currentState = KubotzAnimationScript.FALLING;
            }

            if(phys.getVelocity().x == 0 && phys.isGrounded()){
                currentState = KubotzAnimationScript.IDLE;
            }

            if(phys.isGrounded())
            // Facing opposite of direction
            {
                if (phys.getDirection() == PhysicsComponent.Direction.RIGHT && phys.getVelocity().x < 0
                        || phys.getDirection() == PhysicsComponent.Direction.LEFT && phys.getVelocity().x > 0) {
                    createMotionDust(entity, phys);
                }
            }
        }else if(currentState.equals(KubotzAnimationScript.JUMPING)){
            if(phys.getVelocity().y < 0){
                currentState = KubotzAnimationScript.FALLING;
            }

        }else if(currentState.equals(KubotzAnimationScript.FALLING)){

            if(phys.getVelocity().y > 0){
                if(gamePad.isButtonPressed(GameButton.DPAD_UP)) {
                    currentState = KubotzAnimationScript.JUMPING;
                }
            }else if(phys.getVelocity().x != 0 && phys.isGrounded()){
                currentState = KubotzAnimationScript.RUNNING;
                createMotionDust(entity, phys);
            }else if(phys.isGrounded()){
                currentState = KubotzAnimationScript.IDLE;
                createMotionDust(entity, phys);
            }
        }
    }





    /**
     * Applies the necessary character maps to an entity
     */
    private void handleCharacterMaps(Entity entity, SpriterAnimationComponent anim){

        anim.getPlayer().characterMaps = new com.brashmonkey.spriter.Entity.CharacterMap[3];
        // HEADS
        if(entity.hasComponent(BigBuffHeadComponent.ID)){
            anim.getPlayer().characterMaps[CHAR_MAP_HEAD_ID] = anim.getPlayer().getEntity().getCharacterMap("head_bigbuff");
        } else if(entity.hasComponent(SkullHeadComponent.ID)){
            anim.getPlayer().characterMaps[CHAR_MAP_HEAD_ID] = anim.getPlayer().getEntity().getCharacterMap("head_skull");
        } else if(entity.hasComponent(TerminatorHeadComponent.ID)){
            anim.getPlayer().characterMaps[CHAR_MAP_HEAD_ID] = anim.getPlayer().getEntity().getCharacterMap("head_terminator");
        }


        // ARMS
        // LASER SWORD
        if(entity.hasComponentEnabled(LaserSwordComponent.ID)){
            anim.getPlayer().characterMaps[CHAR_MAP_ARM_ID] = anim.getPlayer().getEntity().getCharacterMap("weapon_laserSword");
        }else if(entity.hasComponent(GunComponent.ID)){
            anim.getPlayer().characterMaps[CHAR_MAP_ARM_ID] = anim.getPlayer().getEntity().getCharacterMap("weapon_laserGunMkI");
        }

        // BOOTS //TODO complete!
        /*if(entity.hasComponentEnabled(FlyingBootsComponent.ID)){
            anim.getPlayer().characterMaps[CHAR_MAP_BOOTS_ID] = anim.getPlayer().getEntity().getCharacterMap("boots_fly");
        }else if(entity.hasComponent(MagneticBootsComponent.ID)){
            anim.getPlayer().characterMaps[CHAR_MAP_BOOTS_ID] = anim.getPlayer().getEntity().getCharacterMap("boots_magnetic");
        }else if(entity.hasComponent(DashBootsComponent.ID)){
            anim.getPlayer().characterMaps[CHAR_MAP_BOOTS_ID] = anim.getPlayer().getEntity().getCharacterMap("boots_dash");
        }*/


    }




    /**
     * Creates motion dust for a certain entity
     */
    private void createMotionDust(Entity entity, PhysicsComponent phys){

        ParticleEffectComponent pef = (ParticleEffectComponent) entity.getComponent(ParticleEffectComponent.ID);
        Vector2 pos = phys.getPosition().cpy();
        pos.y -= phys.getHeight();
        pef.addEffect(Gdx.files.internal(Constants.PARTICLES_LANDING_DUST), pos);
    }

    private void createHurtParticles(Entity entity, PhysicsComponent phys){
        ParticleEffectComponent pef = (ParticleEffectComponent) entity.getComponent(ParticleEffectComponent.ID);
        Vector2 pos = phys.getPosition().cpy();
        pef.addEffect(Gdx.files.internal(Constants.PARTICLES_HIT_STARS), pos);
    }




    /**
     * Creates a sword trail
     * @param entity
     */
    private void createSwordTrail(Entity entity){
        if(true){   //TODO Take this off
            return;
        }
        ParticleEffectComponent pef = (ParticleEffectComponent) entity.getComponent(ParticleEffectComponent.ID);
        SpriterAnimationComponent anim = (SpriterAnimationComponent) entity.getComponent(SpriterAnimationComponent.ID);
        float x = anim.getPlayer().getBone("hand_bone_front").position.x;
        float y = anim.getPlayer().getBone("hand_bone_front").position.y;

        pef.addEffect(Gdx.files.internal(Constants.PARTICLES_HIT_STARS), new Vector2(x,y));

    }






}