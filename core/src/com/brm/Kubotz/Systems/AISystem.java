package com.brm.Kubotz.Systems;

import com.brm.GoatEngine.AI.Pathfinding.Pathfinder;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.Systems.EntitySystem;
import com.brm.Kubotz.Constants;

/**
 * Use to process AI logic
 */
public class AISystem extends EntitySystem {


    public AISystem(EntityManager em) {
        super(em);
    }



    public static Pathfinder pathfinder = new Pathfinder();



    @Override
    public void init(){}

    @Override
    public void update(float dt) {
        // UPDATE PATHFINDER (RESCAN MAP) //TODO Maybe not rescan all the time (or maybe yes for bullets)
        pathfinder.scanMap(em.getEntitiesWithTag(Constants.ENTITY_TAG_PLATFORM));


    }





}
