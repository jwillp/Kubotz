package com.brm.Kubotz.Common.Components.Graphics;


import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.g2d.TextureRegion;
import com.brm.GoatEngine.ECS.core.EntityComponent;
import com.brm.GoatEngine.ECS.core.Entity;

import java.util.Comparator;


/**
 * Used so an entity has a graphical representation
 */
public class SpriteComponent extends EntityComponent {

    public final static String ID = "SPRITE_COMPONENT";

    private TextureRegion currentSprite;
    private Color color = Color.WHITE;

    public float offsetX = 0;
    public float offsetY = 0;

    private int zIndex = 0;

    public TextureRegion getCurrentSprite() {
        return currentSprite;
    }

    public void setCurrentSprite(TextureRegion currentSprite) {
        this.currentSprite = currentSprite;
    }

    /**
     * Sets the color of the sprite
     * @param color
     */
    public void setColor(Color color){
        this.color = color;
    }

    public int getzIndex() {
        return zIndex;
    }

    public void setzIndex(int zIndex) {
        this.zIndex = zIndex;
    }

    public Color getColor() {
        return color;
    }


    /**
     * Comparator used to sort in ascending order (greatest z to smallest z)
     * source: https://github.com/libgdx/libgdx/blob/master/tests/gdx-tests/src/com/badlogic/gdx/tests/SortedSpriteTest.java
     */
    public static class EntitySpriteComponentComparator implements Comparator<Entity>{

        @Override
        public int compare(Entity e1, Entity e2) {
            SpriteComponent s1 = (SpriteComponent) e1.getComponent(SpriteComponent.ID);
            SpriteComponent s2 = (SpriteComponent) e2.getComponent(SpriteComponent.ID);

            return (s2.getzIndex() - s1.getzIndex()) > 0 ? 1 : -1;
        }

    }

}
