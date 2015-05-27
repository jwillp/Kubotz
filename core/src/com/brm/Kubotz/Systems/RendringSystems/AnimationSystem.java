package com.brm.Kubotz.Systems.RendringSystems;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.g2d.TextureRegion;
import com.brashmonkey.spriter.Spriter;
import com.brm.GoatEngine.ECS.Components.EntityComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.Systems.EntitySystem;
import com.brm.Kubotz.Components.Graphics.AnimationComponent;
import com.brm.Kubotz.Components.Graphics.SpriteComponent;
import com.brm.Kubotz.Components.Graphics.SpriterAnimationComponent;

import java.awt.*;

/**
 * Responsible for managing Animations
 */
public class AnimationSystem extends EntitySystem {






    public AnimationSystem(EntityManager em) {
        super(em);
    }

    @Override
    public void init() {

    }


    @Override
    public void update(float dt){

        /*for(Entity entity: em.getEntitiesWithComponent(SpriteComponent.ID)){
            SpriteComponent spriteComp = (SpriteComponent) entity.getComponent(SpriteComponent.ID);
            AnimationComponent animComp = (AnimationComponent)entity.getComponent(AnimationComponent.ID);

            //Set the sprite for the current animation frame
            if(animComp.getCurrentAnimation() != null){
                animComp.stateTime += Gdx.graphics.getDeltaTime();
                spriteComp.setCurrentSprite(new TextureRegion(animComp.getCurrentAnimation().getKeyFrame(animComp.stateTime, true)));
            }
        }*/

        //Update Spriter Animations
        Spriter.update();

    }









}
