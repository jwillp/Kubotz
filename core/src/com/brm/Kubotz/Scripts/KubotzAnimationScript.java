package com.brm.Kubotz.Scripts;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.g2d.Animation;
import com.brm.GoatEngine.ECS.Components.ChildrenComponent;
import com.brm.GoatEngine.ECS.Components.HealthComponent;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityContact;
import com.brm.GoatEngine.ECS.Scripts.EntityScript;
import com.brm.GoatEngine.Input.VirtualButton;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Components.Graphics.AnimationComponent;
import com.brm.Kubotz.Components.Graphics.SpriterAnimationComponent;
import com.brm.Kubotz.Components.Movements.DashComponent;
import com.brm.Kubotz.Components.Movements.FlyComponent;
import com.brm.Kubotz.Components.Movements.RunningComponent;
import com.brm.Kubotz.Components.ParticleEffectComponent;
import com.brm.Kubotz.Components.Parts.Weapons.GunComponent;
import com.brm.Kubotz.Components.Parts.Weapons.LaserSwordComponent;
import com.brm.Kubotz.Input.GameButton;
import com.brm.Kubotz.Systems.RendringSystems.AnimationSheet;

import java.util.ArrayList;

/**
 * Updates a kubotz Sprite according to animation and movement
 * It is an animation Controller
 */
public class KubotzAnimationScript extends EntityScript {

    public static final String ANIM_IDLE = "Idle";
    public static final String ANIM_RUNNING = "Running";
    public static final String ANIM_JUMPING = "Jumping";
    public static final String ANIM_FALLING = "Falling";
    private static final String ANIM_LANDING = "Landing";


    @Override
    public void onUpdate(Entity entity) {
        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
        SpriterAnimationComponent anim = (SpriterAnimationComponent)entity.getComponent(SpriterAnimationComponent.ID);
        VirtualGamePad gamePad = (VirtualGamePad)entity.getComponent(VirtualGamePad.ID);
        HealthComponent health = (HealthComponent) entity.getComponent(HealthComponent.ID);

        this.handleCharacterMaps(entity, anim);


        //Run
        if(entity.hasComponent(RunningComponent.ID)){
            this.handleRunning(phys, gamePad, anim);
        }

        //Fly
        if(entity.hasComponent(FlyComponent.ID)){
            this.handleFlying(phys, anim);
        }

        //DASH
        if(entity.hasComponent(DashComponent.ID)){
            DashComponent dashComp = (DashComponent)entity.getComponent(DashComponent.ID);
            this.handleDashing(dashComp, phys, anim);
        }

        // GUN
        if(entity.hasComponent(GunComponent.ID)){
            GunComponent gun = (GunComponent)entity.getComponent(GunComponent.ID);
            handleGuns(gun, anim);
        }


        //DYING
        if(health.getAmount() == health.getMinAmount()){
            anim.setAnimation("Dying");
            // TODO dying Particle Effect set object alpha to 0
            ParticleEffectComponent pe = (ParticleEffectComponent) entity.getComponent(ParticleEffectComponent.ID);
            pe.addEffect(Gdx.files.internal("particles/deathDust.pe"), phys.getPosition().cpy(), true);
            Logger.log("YOOO: " + pe.getEffects().size());
        }






    }


    /**
     * Handles the animations while the player is Running
     * @param phys
     * @param gamePad
     * @param anim
     */
    private void handleRunning(PhysicsComponent phys, VirtualGamePad gamePad, SpriterAnimationComponent anim){
        this.handleFlip(phys, anim);
        if(phys.isGrounded()) {

            if(phys.getVelocity().isZero()){
                //anim.setAnimation(ANIM_IDLE);
            }

            //RUNNING
            else if((gamePad.isButtonPressed(GameButton.MOVE_LEFT) || gamePad.isButtonPressed(GameButton.MOVE_RIGHT)) &&
                    phys.getVelocity().x != 0)
            {
                anim.setAnimation(ANIM_RUNNING);
                //TODO set speed of anim according to velX
            }


        }else{
        //FALLING TODO same as gravity scale
            if(phys.getVelocity().y < 0){
                anim.setAnimation(ANIM_FALLING);
            }
        }

        //JUMPING TODO Opposite of gravity scale
        if(phys.getVelocity().y > 0){
            anim.setAnimation(ANIM_JUMPING);
        }

    }


    /**
     *
     */
    private void handleGuns(GunComponent gun, SpriterAnimationComponent anim){
        if(gun.isShooting()){
            if(!anim.getPlayer().getAnimation().name.equals("Shooting")){
                anim.getPlayer().setAnimation("Shooting");
            }
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
     * Handles the animtions while the player is flying
     * @param phys
     * @param anim
     */
    private void handleFlying(PhysicsComponent phys, SpriterAnimationComponent anim){

    }






























    /**
     * Handles the animations while the player is Dashing
     * @param dashComp
     * @param phys
     * @param anim
     */
    private void handleDashing(DashComponent dashComp, PhysicsComponent phys, SpriterAnimationComponent anim){
        if(dashComp.getPhase() == DashComponent.Phase.PREPARATION){
            anim.getPlayer().setAnimation("Dash_begin");
        }

        if(dashComp.getPhase() == DashComponent.Phase.TRAVEL){
            anim.getPlayer().setAnimation("Dash_dashin");
        }

        if(dashComp.getPhase() == DashComponent.Phase.DECELERATION){
            anim.getPlayer().setAnimation("Dash_ending");
            //anim.getPlayer().getAnimation().looping = false;
        }
    }







































    /**
     * Handles if we need to add character maps (weapons overlay)
     */
    private void handleCharacterMaps(Entity entity, SpriterAnimationComponent anim){

        //GunComponent
        if(entity.hasComponent(GunComponent.ID)){
            com.brashmonkey.spriter.Entity.CharacterMap map = anim.getPlayer()
                    .getEntity().getCharacterMap("weapon_laserGunMkI");
            anim.getPlayer().characterMaps = new com.brashmonkey.spriter.Entity.CharacterMap[3];
            anim.getPlayer().characterMaps[0] = map;
        }

        //SwordComponent
        if(entity.hasComponent(LaserSwordComponent.ID)){
            com.brashmonkey.spriter.Entity.CharacterMap map = anim.getPlayer()
                    .getEntity().getCharacterMap("weapon_laserSword");
            anim.getPlayer().characterMaps = new com.brashmonkey.spriter.Entity.CharacterMap[3];
            anim.getPlayer().characterMaps[0] = map;
        }


    }






























}
