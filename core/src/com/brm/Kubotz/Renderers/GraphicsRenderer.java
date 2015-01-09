package com.brm.Kubotz.Renderers;

import com.brm.GoatEngine.ECS.Entity.Entity;

public abstract class GraphicsRenderer {


    public GraphicsRenderer(){

    }

    /**
     * Used to update the state of animation etc...
     * @param go: the gameObject to render
     */
    public abstract void update(Entity go);

    /**
     * Actually draws the graphics on screen
     * @param go: game object to render
     */
    public abstract void draw(Entity go);



}
