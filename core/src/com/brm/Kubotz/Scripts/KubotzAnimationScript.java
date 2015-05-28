package com.brm.Kubotz.Scripts;

import com.badlogic.gdx.graphics.g2d.Animation;
import com.brm.GoatEngine.ECS.Components.ChildrenComponent;
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



    @Override
    public void onUpdate(Entity entity) {
        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
        SpriterAnimationComponent anim = (SpriterAnimationComponent)entity.getComponent(SpriterAnimationComponent.ID);
        VirtualGamePad gamePad = (VirtualGamePad)entity.getComponent(VirtualGamePad.ID);

        this.handleRunning(phys, gamePad, anim);

        this.handleFlying(phys, anim);


        //DASH
        if(entity.hasComponent(DashComponent.ID)){
            DashComponent dashComp = (DashComponent)entity.getComponent(DashComponent.ID);
            this.handleDashing(dashComp, phys, anim);
        }


        if(entity.hasComponent(GunComponent.ID)){
            GunComponent gun = (GunComponent)entity.getComponent(GunComponent.ID);
            handleGuns(gun, anim);
        }
        this.handleCharacterMaps(entity, anim);
    }


    /**
     * Handles the animations while the player is Running
     * @param phys
     * @param gamePad
     * @param anim
     */
    private void handleRunning(PhysicsComponent phys, VirtualGamePad gamePad, SpriterAnimationComponent anim){
        if(phys.isGrounded()){
            //IDLE
            if(phys.getVelocity().isZero()){
                //anim.getPlayer().setAnimation(ANIM_IDLE);
            }

            //RUNNING
            boolean btn = gamePad.isButtonPressed(GameButton.MOVE_LEFT) || gamePad.isButtonPressed(GameButton.MOVE_RIGHT);

            if(phys.getVelocity().x != 0 && phys.isGrounded() && btn){
                anim.getPlayer().setAnimation(ANIM_RUNNING);
                //TODO set speed of anim according to velX
            }

        }else{
            //FALLING TODO same as gravity scale
            if(phys.getVelocity().y < 0){
                anim.getPlayer().setAnimation(ANIM_FALLING);
            }
        }

        //JUMPING TODO Opposite of gravity scale
        if(phys.getVelocity().y > 0){
            anim.getPlayer().setAnimation(ANIM_JUMPING);
        }

        //LANDING
        if(phys.getVelocity().y < 0 && phys.isGrounded()){
            Logger.log("LANDING");
        }

        this.handleFlip(phys, anim);
    }


    /**
     *
     */
    private void handleGuns(GunComponent gun, SpriterAnimationComponent anim){
        if(gun.isShooting()){
            anim.getPlayer().setAnimation("Shooting");
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
