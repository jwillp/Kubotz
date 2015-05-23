package com.brm.Kubotz.Component;


import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.g2d.TextureRegion;
import com.brm.GoatEngine.ECS.Components.EntityComponent;

import java.util.Comparator;


/**
 * Used so an entity has a graphical representation
 */
public class SpriteComponent extends EntityComponent {

    public final static String ID = "SPRITE_COMPONENT";

    private TextureRegion currentSprite;
    private Color color = Color.WHITE;

    public int zIndex = 0;

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


    /**
     * Comparator used to sort in ascending order (greatest z to smallest z)
     * source: https://github.com/libgdx/libgdx/blob/master/tests/gdx-tests/src/com/badlogic/gdx/tests/SortedSpriteTest.java
     */
    public class SpriteComponentComparator implements Comparator<SpriteComponent>{
        @Override
        public int compare(SpriteComponent o1, SpriteComponent o2) {
            return (o2.zIndex - o1.zIndex) > 0 ? 1 : -1;
        }
    }

}
