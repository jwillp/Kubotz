package com.brm.Kubotz.Scripts;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.utils.Components.HealthComponent;
import com.brm.GoatEngine.ECS.utils.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.core.Entity.Entity;
import com.brm.GoatEngine.ECS.utils.Scripts.EntityScript;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.Kubotz.Components.Graphics.ParticleEffectComponent;
import com.brm.Kubotz.Components.Graphics.SpriterAnimationComponent;
import com.brm.Kubotz.Components.Parts.Weapons.GunComponent;
import com.brm.Kubotz.Components.Parts.Weapons.LaserSwordComponent;
import com.brm.Kubotz.Components.MeleeComponent;
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
    public static final String SWORD_SLASH = "Sword_slash_01";

    public static final int CHAR_MAP_HEAD_ID = 0;
    public static final int CHAR_MAP_ARM_ID = 0;
    public static final int CHAR_MAP_BOOTS_ID = 0;



    public static final String DEFAULT = IDLE;

    //Default state
    private String currentState = DEFAULT;


    @Override
    public void onUpdate(Entity entity) {
        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
        SpriterAnimationComponent anim = (SpriterAnimationComponent)entity.getComponent(SpriterAnimationComponent.ID);
        VirtualGamePad gamePad = (VirtualGamePad)entity.getComponent(VirtualGamePad.ID);
        HealthComponent health = (HealthComponent) entity.getComponent(HealthComponent.ID);



        handleRunning(entity, phys, gamePad, anim);

        // PUNCH
        if(entity.hasComponentEnabled(MeleeComponent.ID)){
            MeleeComponent punch = (MeleeComponent) entity.getComponent(MeleeComponent.ID);
            this.handlePunch(punch);
        }

        //GUNS
        if(entity.hasComponentEnabled(GunComponent.ID)){
            GunComponent gun = (GunComponent) entity.getComponent(GunComponent.ID);
            this.handleGuns(gun);
        }

        // SWORD
        if(entity.hasComponent(LaserSwordComponent.ID)){
            LaserSwordComponent laserSword = (LaserSwordComponent) entity.getComponent(LaserSwordComponent.ID);
            this.handleLaserSword(laserSword);
        }

        this.handleCharacterMaps(entity, anim);
        anim.setAnimation(currentState);
        if(!currentState.equals(JUMPING)) {
            handleFlip(phys, anim);
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
        if(currentState.equals(IDLE)){
            if(gamePad.isButtonPressed(GameButton.MOVE_LEFT) || gamePad.isButtonPressed(GameButton.MOVE_RIGHT)) {
                currentState = "Running";
            }

            if(phys.getVelocity().y > 0){
                if(gamePad.isButtonPressed(GameButton.MOVE_UP)) {
                    currentState = JUMPING;
                }
            }

            if(!phys.isGrounded() && phys.getVelocity().y < 0){
                currentState = FALLING;
            }

        }else if(currentState.equals(RUNNING)){
            if(phys.getVelocity().y > 0){
                if(gamePad.isButtonPressed(GameButton.MOVE_UP)) {
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
                if(gamePad.isButtonPressed(GameButton.MOVE_UP)) {
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
     * Handles animation when entity is punching
     * @param punch
     */
    private void handlePunch(MeleeComponent punch){
        if(punch.getPunchBullet() != null){
            if(currentState.equals(FALLING) || currentState.equals(JUMPING)) {
                currentState = AIR_KICKING;
            }else{
                currentState = AIR_KICKING;

            }
        }
        if(currentState.equals(PUNCHING) || currentState.equals(KICKING) || currentState.equals(AIR_KICKING) ){
            if(punch.getDurationTimer().isDone()){
                currentState = IDLE;
            }
        }
    }


    /**
    * Handles Kubotz with Guns
    * @param gun
    */
    private void handleGuns(GunComponent gun) {
        if(gun.isShooting()){
            if(!currentState.equals(SHOOTING)) {
                currentState = SHOOTING;
            }
        }
        if(currentState.equals(SHOOTING)){
            if(gun.getCooldown().isDone()){
                currentState = DEFAULT;
            }

        }
    }


    /**
     * Handles Kubotz with Laser Sword
     * @param laserSword
     */
    private void handleLaserSword(LaserSwordComponent laserSword) {
        if(laserSword.isSwinging()){
            if(!currentState.equals(SWORD_SLASH)) {
                currentState = SWORD_SLASH;
            }
        }
        if(currentState.equals(SWORD_SLASH)){
            if(laserSword.getDurationTimer().isDone()){
                currentState = DEFAULT;
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
        pef.addEffect(Gdx.files.internal("particles/landingDust.pe"), pos);
    }



}
