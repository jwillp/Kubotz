package com.brm.Kubotz.Common.Systems.RendringSystems;



import com.brashmonkey.spriter.Spriter;
import com.brm.GoatEngine.ECS.core.EntitySystem;

/**
 * Responsible for managing Animations
 */
public class AnimationSystem extends EntitySystem {


    public AnimationSystem() {}

    @Override
    public void init(){}


    @Override
    public void update(float dt){

        /*for(Entity entity: entityManager.getEntitiesWithComponent(SpriteComponent.ID)){
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
