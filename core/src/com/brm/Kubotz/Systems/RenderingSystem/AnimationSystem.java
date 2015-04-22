package com.brm.Kubotz.Systems.RenderingSystem;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.g2d.Animation;
import com.badlogic.gdx.graphics.g2d.Sprite;
import com.badlogic.gdx.graphics.g2d.TextureAtlas;
import com.badlogic.gdx.graphics.g2d.TextureRegion;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.System.EntitySystem;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Component.SpriteComponent;

/**
 * Responsible for managing Animations
 */
public class AnimationSystem extends EntitySystem {

    TextureAtlas textureAtlas;
    public AnimationSystem(EntityManager em) {
        super(em);
        this.textureAtlas = new TextureAtlas(Gdx.files.internal("textures/textures.atlas"), Gdx.files.internal("textures"));
    }




    public void update(){

        for(Entity entity: em.getEntitiesWithComponent(SpriteComponent.ID)){
            SpriteComponent spriteComp = (SpriteComponent) entity.getComponent(SpriteComponent.ID);
            PhysicsComponent phys = (PhysicsComponent)  entity.getComponent(PhysicsComponent.ID);


            //Change Animation according to State



            //Update the sprite according to the current animation frame

            if(spriteComp.currentFrame == null){

                spriteComp.animation = new Animation(1/74f, textureAtlas.findRegions("idle_"));
                spriteComp.animation.setPlayMode(Animation.PlayMode.LOOP);
            }


            if(!phys.isGrounded()){
                if(phys.getVelocity().y > 0){
                    spriteComp.animation = new Animation(1/74f, textureAtlas.findRegions("jumping_"));
                    spriteComp.animation.setPlayMode(Animation.PlayMode.NORMAL);
                }

            }else{
                if(phys.getVelocity().x != 0){
                    spriteComp.animation = new Animation(1/74f, textureAtlas.findRegions("running_"));
                    spriteComp.animation.setPlayMode(Animation.PlayMode.LOOP);
                }else{
                    spriteComp.animation = new Animation(1/74f, textureAtlas.findRegions("idle_"));
                    spriteComp.animation.setPlayMode(Animation.PlayMode.LOOP);
                }

            }


            spriteComp.stateTime += Gdx.graphics.getDeltaTime();


            spriteComp.currentFrame = spriteComp.animation.getKeyFrame(spriteComp.stateTime, true);
            if(phys.direction == PhysicsComponent.Direction.RIGHT){
                spriteComp.currentFrame.flip(true, false);
            }else{
                if(spriteComp.currentFrame.isFlipX()){
                    spriteComp.currentFrame.flip(true,false);
                }
            }






        }
    }









}
