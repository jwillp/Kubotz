package com.brm.Kubotz.Common.Components.Graphics;

import com.badlogic.gdx.graphics.g2d.Animation;
import com.badlogic.gdx.utils.XmlReader;
import com.brm.GoatEngine.ECS.core.EntityComponent;

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


    /**
     * Desiralizes a component
     *
     * @param componentData the data as an XML element
     */
    @Override
    public void deserialize(XmlReader.Element componentData) {

    }
}
