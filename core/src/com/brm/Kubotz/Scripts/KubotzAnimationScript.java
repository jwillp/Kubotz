package com.brm.Kubotz.Scripts;

import com.badlogic.gdx.graphics.g2d.Animation;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityContact;
import com.brm.GoatEngine.ECS.Scripts.EntityScript;
import com.brm.GoatEngine.Input.VirtualButton;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Component.AnimationComponent;
import com.brm.Kubotz.Components.Movements.DashComponent;
import com.brm.Kubotz.Systems.RenderingSystem.AnimationSheet;

import java.util.ArrayList;

/**
 * Updates a kubotz Sprite according to animation and movement
 */
public class KubotzAnimationScript extends EntityScript {


    AnimationSheet idle = new AnimationSheet("textures/idle.png", 1/15f);
    AnimationSheet running = new AnimationSheet("textures/running.png", 1/15f);
    AnimationSheet jumping = new AnimationSheet("textures/jumping.png", 1/15f);
    AnimationSheet falling = new AnimationSheet("textures/falling.png", 1/15f);
    AnimationSheet kicking = new AnimationSheet("textures/kicking.png", 1/15f);
    AnimationSheet dashing = new AnimationSheet("textures/dashing.png", 1/74f);
    AnimationSheet dashingPrep = new AnimationSheet("textures/dashing_prep.png", 1/30f);




    @Override
    public void onInit(Entity entity) {


    }

    @Override
    public void onUpdate(Entity entity) {
        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
        AnimationComponent animComp = (AnimationComponent)entity.getComponent(AnimationComponent.ID);

        //IDLE
        if(phys.getVelocity().isZero()){
            animComp.setCurrentAnimation(idle.generateAnimation());
            animComp.getCurrentAnimation().setPlayMode(Animation.PlayMode.LOOP);
        }

        //RUNNING
        if(phys.getVelocity().x != 0 && phys.isGrounded()){
            animComp.setCurrentAnimation(running.generateAnimation());
            animComp.getCurrentAnimation().setPlayMode(Animation.PlayMode.LOOP);
        }

        //JUMPING TODO Opposite of gravity scale
        if(phys.getVelocity().y > 0){
            animComp.setCurrentAnimation(jumping.generateAnimation());
            animComp.getCurrentAnimation().setPlayMode(Animation.PlayMode.NORMAL);
        }

        //FALLING TODO same gravity scale
        if(phys.getVelocity().y < 0){
            animComp.setCurrentAnimation(falling.generateAnimation());
            animComp.getCurrentAnimation().setPlayMode(Animation.PlayMode.LOOP);
        }

        //LANDING
        if(phys.getVelocity().y < 0 && phys.isGrounded()){
            Logger.log("LANDING");
        }

        //DASH ANIM
        if(entity.hasComponent(DashComponent.ID)){
            DashComponent dashComp = (DashComponent)entity.getComponent(DashComponent.ID);

            if(dashComp.getPhase() == DashComponent.Phase.PREPARATION){
                animComp.setCurrentAnimation(dashingPrep.generateAnimation());
                animComp.getCurrentAnimation().setPlayMode(Animation.PlayMode.LOOP);
            }

            if(dashComp.getPhase() == DashComponent.Phase.TRAVEL){
                animComp.setCurrentAnimation(dashing.generateAnimation());
                animComp.getCurrentAnimation().setPlayMode(Animation.PlayMode.LOOP);
            }
        }

    }

    @Override
    public void onInput(Entity entity, ArrayList<VirtualButton> pressedButtons) {

    }

    @Override
    public void onCollision(EntityContact contact) {



    }

    @Override
    public void onDetach(Entity entity) {


    }
}
