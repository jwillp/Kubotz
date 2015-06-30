package com.brm.GoatEngine.ECS;

import com.badlogic.gdx.math.Vector2;

/**
 * Some useful properties from the Editor for the entities.
 * That are not part of the xml
 */
public class EditorEntityProperty {

    public final Vector2 position;
    public final float width;
    public final float height;

    public EditorEntityProperty(Vector2 position, float width, float height) {
        this.position = position;
        this.width = width;
        this.height = height;
    }

}
