package com.brm.GoatEngine.StateManger;

import com.badlogic.gdx.math.Rectangle;

public class GameMath {

    /**
     * Test if the Rectangle A contains the Rectangle B
     * @param a: Rectangle A
     * @param b: Rectangle B
     * @return: Boolean: Whether or not a contains B
     */
    public static boolean contains(Rectangle a, Rectangle b){
        float xmin = b.x;
        float xmax = xmin + b.width;

        float ymin = b.y;
        float ymax = ymin + b.height;

        return ((xmin >= a.x && xmin <= a.x + a.width) && (xmax >= a.x && xmax <= a.x + a.width))
            && ((ymin >= a.y && ymin <= a.y + a.height) && (ymax >= a.y && ymax <= a.y + a.height));
    }






}
