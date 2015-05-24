package com.brm.Kubotz.Components.Graphics;

import com.badlogic.gdx.graphics.g2d.Animation;
import com.brm.GoatEngine.ECS.Components.EntityComponent;

/**
 * Used to add an currentAnimation to an entity
 */
public class AnimationComponent extends EntityComponent {

    public final static String ID = "ANIMATION_COMPONENT";

    private Animation currentAnimation;

    public float stateTime; //The amount of time the entity has been with that particular state (currentAnimation)


    public Animation getCurrentAnimation() {
        return currentAnimation;
    }

    public void setCurrentAnimation(Animation currentAnimation) {
        this.currentAnimation = currentAnimation;
    }



}
