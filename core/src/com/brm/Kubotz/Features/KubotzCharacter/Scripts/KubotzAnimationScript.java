package com.brm.Kubotz.Features.KubotzCharacter.Scripts;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.core.Entity.Entity;
import com.brm.GoatEngine.ECS.core.Entity.EntityManager;
import com.brm.GoatEngine.ECS.core.Entity.Event;
import com.brm.GoatEngine.ECS.utils.Components.HealthComponent;
import com.brm.GoatEngine.ECS.utils.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.utils.Scripts.EntityScript;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Common.Components.Graphics.ParticleEffectComponent;
import com.brm.Kubotz.Common.Components.Graphics.SpriterAnimationComponent;
import com.brm.Kubotz.Common.Events.DamageTakenEvent;
import com.brm.Kubotz.Features.LaserGuns.Events.GunShotEvent;
import com.brm.Kubotz.Features.LaserSword.Events.SwordSwungEvent;
import com.brm.Kubotz.Features.MeleeAttacks.Components.MeleeComponent;
import com.brm.Kubotz.Features.LaserGuns.Components.GunComponent;
import com.brm.Kubotz.Features.LaserSword.Components.LaserSwordComponent;
import com.brm.Kubotz.Constants;
import com.brm.Kubotz.Features.MeleeAttacks.Events.PunchEvent;
import com.brm.Kubotz.Input.GameButton;

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

    public static final String HURT = "HURT";




    public static final int CHAR_MAP_HEAD_ID = 0;
    public static final int CHAR_MAP_ARM_ID = 0;
    public static final int CHAR_MAP_BOOTS_ID = 0;



    public static final String DEFAULT = IDLE;

    //Default state
    private String currentState = DEFAULT;


    @Override
    public <T extends Event> void onEvent(T event) {
        if(event.getClass() == GunShotEvent.class){
            onGunShot((GunShotEvent) event);

        }else if(event.getClass() == SwordSwungEvent.class){
            onSwordSwing((SwordSwungEvent) event);

        }else if(event.getClass() == PunchEvent.class){
            onPunch((PunchEvent) event);
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
        if(!currentState.equals(JUMPING)) {
            handleFlip(phys, anim);
        }


        if(currentState.equals(HURT)){
            //createSwordTrail(entity);
            createHurtParticles(entity, phys);
        }




    }








    /**
     * Called when the entity shoots a gun
     * @param e the event
     */
    private void onGunShot(GunShotEvent e){
        currentState = SHOOTING;
    }

    /**
     * Called when the entity swings a sword
     * @param e the event
     */
    private void onSwordSwing(SwordSwungEvent e){
        currentState = SWORD_SLASH;
    }

    /**
     * Called when an entity punches
     * @param e
     */
    private void onPunch(PunchEvent e){
        currentState = AIR_KICKING;
    }



    private void onDamageTaken(DamageTakenEvent e){
        currentState = HURT;
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
        if(currentState.equals(IDLE)){
            if(gamePad.isButtonPressed(GameButton.DPAD_LEFT) || gamePad.isButtonPressed(GameButton.DPAD_RIGHT)) {
                currentState = "Running";
            }

            if(phys.getVelocity().y > 0){
                if(gamePad.isButtonPressed(GameButton.DPAD_UP)) {
                    currentState = JUMPING;
                }
            }

            if(!phys.isGrounded() && phys.getVelocity().y < 0){
                currentState = FALLING;
            }

        }else if(currentState.equals(RUNNING)){
            if(phys.getVelocity().y > 0){
                if(gamePad.isButtonPressed(GameButton.DPAD_UP)) {
                    currentState = JUMPING;
                }
            }
            if(!phys.isGrounded() && phys.getVelocity().y < 0){
                currentState = FALLING;
            }

            if(phys.getVelocity().x == 0 && phys.isGrounded()){
                currentState = IDLE;
            }

            if(phys.isGrounded())
            // Facing opposite of direction
            {
                if (phys.getDirection() == PhysicsComponent.Direction.RIGHT && phys.getVelocity().x < 0
                        || phys.getDirection() == PhysicsComponent.Direction.LEFT && phys.getVelocity().x > 0) {
                    createMotionDust(entity, phys);
                }
            }
        }else if(currentState.equals(JUMPING)){
            if(phys.getVelocity().y < 0){
                currentState = FALLING;
            }

        }else if(currentState.equals(FALLING)){

            if(phys.getVelocity().y > 0){
                if(gamePad.isButtonPressed(GameButton.DPAD_UP)) {
                    currentState = JUMPING;
                }
            }else if(phys.getVelocity().x != 0 && phys.isGrounded()){
                currentState = RUNNING;
                createMotionDust(entity, phys);
            }else if(phys.isGrounded()){
                currentState = IDLE;
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


        // ARMS
        // LASER SWORD
        if(entity.hasComponentEnabled(LaserSwordComponent.ID)){
            anim.getPlayer().characterMaps[CHAR_MAP_ARM_ID] = anim.getPlayer().getEntity().getCharacterMap("weapon_laserSword");
        }else if(entity.hasComponent(GunComponent.ID)){
            anim.getPlayer().characterMaps[CHAR_MAP_ARM_ID] = anim.getPlayer().getEntity().getCharacterMap("weapon_laserGunMkI");
        }
        
        // BOOTS

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
        pos.y -= phys.getHeight();
        pef.addEffect(Gdx.files.internal(Constants.PARTICLES_LANDING_DUST), pos);
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